import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { basePrisma, MEMBER_COOKIE, ACTIVE_CHILD_COOKIE } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

// GET: 現在アクティブな子プロファイルID
export async function GET() {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const member = await basePrisma.familyMember.findUnique({ where: { token } });
  if (!member) return NextResponse.json({ error: "メンバーが見つかりません" }, { status: 401 });

  // 子端末は自身に固定
  if (member.role === "CHILD") {
    return NextResponse.json({ activeChildId: member.childProfileId, locked: true });
  }
  const active = store.get(ACTIVE_CHILD_COOKIE)?.value;
  if (active) return NextResponse.json({ activeChildId: active, locked: false });
  const first = await basePrisma.childProfile.findFirst({
    where: { familyId: member.familyId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return NextResponse.json({ activeChildId: first?.id ?? null, locked: false });
}

// POST: 親が表示する子プロファイルを切り替える(Cookieに保存)
export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const member = await basePrisma.familyMember.findUnique({ where: { token } });
  if (!member || member.role !== "PARENT") {
    return NextResponse.json({ error: "親のみ切り替えできます" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const childId = typeof body.childId === "string" ? body.childId : "";
  const child = await basePrisma.childProfile.findUnique({ where: { id: childId } });
  if (!child || child.familyId !== member.familyId) {
    return NextResponse.json({ error: "対象の子が見つかりません" }, { status: 404 });
  }

  store.set(ACTIVE_CHILD_COOKIE, childId, COOKIE_OPTS);
  return NextResponse.json({ ok: true, activeChildId: childId });
}
