import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { basePrisma, MEMBER_COOKIE, invalidateMemberCache } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: 子端末が6桁コードで家族に参加
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const nickname = typeof body.nickname === "string" && body.nickname.trim()
    ? body.nickname.trim() : "こども";

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "6桁の数字コードを入力してください" }, { status: 400 });
  }

  // 原子的に消費: 未使用かつ期限内のコードだけを usedAt 更新できた場合のみ成功。
  // 同じコードの同時利用(レース)や使い回しはここで遮断される。
  const consumed = await basePrisma.pairingCode.updateMany({
    where: { code, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (consumed.count === 0) {
    return NextResponse.json(
      { error: "コードが無効です(期限切れ・使用済み・入力ミス)" },
      { status: 400 },
    );
  }

  const pairing = await basePrisma.pairingCode.findUnique({ where: { code } });
  if (!pairing) {
    return NextResponse.json({ error: "コードが見つかりません" }, { status: 400 });
  }

  const store = await cookies();
  const oldToken = store.get(MEMBER_COOKIE)?.value;

  const token = randomBytes(32).toString("hex");
  const member = await basePrisma.familyMember.create({
    data: { familyId: pairing.familyId, role: "CHILD", nickname, token },
  });

  store.set(MEMBER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  if (oldToken) invalidateMemberCache(oldToken);

  return NextResponse.json({
    ok: true,
    member: { id: member.id, role: member.role, nickname: member.nickname },
    familyId: pairing.familyId,
  }, { status: 201 });
}
