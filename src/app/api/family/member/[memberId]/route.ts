import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { basePrisma, MEMBER_COOKIE, invalidateMemberCache } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE: 親が家族メンバー(デバイス)を削除・失効させる
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const actor = await basePrisma.familyMember.findUnique({ where: { token } });
  if (!actor) return NextResponse.json({ error: "メンバーが見つかりません" }, { status: 401 });
  if (actor.role !== "PARENT") return NextResponse.json({ error: "親のみ操作できます" }, { status: 403 });

  const target = await basePrisma.familyMember.findUnique({ where: { id: memberId } });
  if (!target || target.familyId !== actor.familyId) {
    return NextResponse.json({ error: "対象メンバーが見つかりません" }, { status: 404 });
  }

  // 最後の親は削除不可(家族が管理不能になるのを防ぐ)
  if (target.role === "PARENT") {
    const parentCount = await basePrisma.familyMember.count({
      where: { familyId: actor.familyId, role: "PARENT" },
    });
    if (parentCount <= 1) {
      return NextResponse.json(
        { error: "家族に親が1人しかいないため削除できません。先に別の親を招待してください。" },
        { status: 400 },
      );
    }
  }

  await basePrisma.familyMember.delete({ where: { id: memberId } });
  invalidateMemberCache(target.token);

  return NextResponse.json({ ok: true });
}
