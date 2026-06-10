import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { basePrisma, MEMBER_COOKIE, invalidateChildCache } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const AVATARS = ["🧒", "👦", "👧", "🧑", "🐱", "🐶", "🦊", "🐼", "🦁", "🐯", "🦄", "🐸"];
const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

async function parentMember() {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  const member = await basePrisma.familyMember.findUnique({ where: { token } });
  if (!member || member.role !== "PARENT") return null;
  return member;
}

// GET: 家族の子プロファイル一覧
export async function GET() {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const member = await basePrisma.familyMember.findUnique({ where: { token } });
  if (!member) return NextResponse.json({ error: "メンバーが見つかりません" }, { status: 401 });
  const children = await basePrisma.childProfile.findMany({
    where: { familyId: member.familyId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ children });
}

// POST: 子プロファイルを追加(親のみ)
export async function POST(req: Request) {
  const parent = await parentMember();
  if (!parent) return NextResponse.json({ error: "親のみ操作できます" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 20) : "こども";

  // 既存数に応じて未使用のアバター・色を割り当て(重複を避ける)
  const existing = await basePrisma.childProfile.findMany({
    where: { familyId: parent.familyId },
    select: { avatar: true, color: true },
  });
  const idx = existing.length;
  const avatar = typeof body.avatar === "string" && body.avatar ? body.avatar : AVATARS[idx % AVATARS.length];
  const color = typeof body.color === "string" && body.color ? body.color : COLORS[idx % COLORS.length];

  const child = await basePrisma.childProfile.create({
    data: { familyId: parent.familyId, name, avatar, color },
  });
  invalidateChildCache(parent.familyId);
  return NextResponse.json({ child }, { status: 201 });
}
