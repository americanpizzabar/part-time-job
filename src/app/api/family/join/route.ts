import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { basePrisma, MEMBER_COOKIE, invalidateMemberCache } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: 招待コード(6桁)で家族に参加。ロールはコード発行時の指定に従う(子/親どちらも可)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const rawNickname = typeof body.nickname === "string" ? body.nickname.trim() : "";

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

  const role = pairing.role === "PARENT" ? "PARENT" : "CHILD";
  const nickname = rawNickname || (role === "PARENT" ? "おうちの人" : "こども");
  const token = randomBytes(32).toString("hex");
  const member = await basePrisma.familyMember.create({
    data: { familyId: pairing.familyId, role, nickname, token },
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
