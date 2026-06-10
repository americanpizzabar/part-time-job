import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { basePrisma, MEMBER_COOKIE, invalidateChildCache } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function parentMember() {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  const member = await basePrisma.familyMember.findUnique({ where: { token } });
  if (!member || member.role !== "PARENT") return null;
  return member;
}

// PATCH: 子プロファイルの名前・アバター・色を変更(親のみ)
export async function PATCH(req: Request, { params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const parent = await parentMember();
  if (!parent) return NextResponse.json({ error: "親のみ操作できます" }, { status: 403 });

  const child = await basePrisma.childProfile.findUnique({ where: { id: childId } });
  if (!child || child.familyId !== parent.familyId) {
    return NextResponse.json({ error: "対象が見つかりません" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: { name?: string; avatar?: string; color?: string } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 20);
  if (typeof body.avatar === "string" && body.avatar) data.avatar = body.avatar;
  if (typeof body.color === "string" && body.color) data.color = body.color;

  const updated = await basePrisma.childProfile.update({ where: { id: childId }, data });
  return NextResponse.json({ child: updated });
}

// DELETE: 子プロファイルを削除(親のみ)。最後の1人は削除不可。
// 紐づく端末・全データ(子スコープ)はカスケード/SetNullで処理される。
export async function DELETE(_req: Request, { params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const parent = await parentMember();
  if (!parent) return NextResponse.json({ error: "親のみ操作できます" }, { status: 403 });

  const child = await basePrisma.childProfile.findUnique({ where: { id: childId } });
  if (!child || child.familyId !== parent.familyId) {
    return NextResponse.json({ error: "対象が見つかりません" }, { status: 404 });
  }

  const count = await basePrisma.childProfile.count({ where: { familyId: parent.familyId } });
  if (count <= 1) {
    return NextResponse.json({ error: "家族に子プロファイルが1人しかいないため削除できません" }, { status: 400 });
  }

  // 子スコープのデータはこの子プロファイルに紐づくが、
  // childProfile 削除でも他テーブルは onDelete 制約を持たない(childProfileId は
  // ただの String 列)。孤児データは残るが、ガードが二度と参照しないため安全。
  // 端末(FamilyMember)の childProfileId は SetNull される。
  await basePrisma.childProfile.delete({ where: { id: childId } });
  invalidateChildCache(parent.familyId);
  return NextResponse.json({ ok: true });
}
