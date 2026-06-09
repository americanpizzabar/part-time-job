import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomInt } from "crypto";
import { basePrisma, MEMBER_COOKIE } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CODE_TTL_MS = 10 * 60 * 1000; // 有効期限10分

// POST: 親がワンタイム招待コード(6桁)を発行
// body.role で招待する相手を指定: "CHILD"(既定) | "PARENT"(もう一人の親)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const inviteRole = body.role === "PARENT" ? "PARENT" : "CHILD";
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "先に家族のセットアップが必要です" }, { status: 401 });
  }
  const member = await basePrisma.familyMember.findUnique({ where: { token } });
  if (!member) {
    return NextResponse.json({ error: "メンバーが見つかりません" }, { status: 401 });
  }
  if (member.role !== "PARENT") {
    return NextResponse.json({ error: "招待コードを発行できるのは親だけです" }, { status: 403 });
  }

  // 衝突しない6桁コードを生成(暗号学的乱数)
  let code = "";
  for (let i = 0; i < 10; i++) {
    code = String(randomInt(100000, 1000000));
    const dup = await basePrisma.pairingCode.findUnique({ where: { code } });
    if (!dup) break;
    code = "";
  }
  if (!code) {
    return NextResponse.json({ error: "コード生成に失敗しました。再試行してください" }, { status: 500 });
  }

  // この家族の未使用コードは無効化(常に最新1枚のみ有効)
  await basePrisma.pairingCode.updateMany({
    where: { familyId: member.familyId, usedAt: null },
    data: { usedAt: new Date(0) }, // epoch = 失効扱い
  });

  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await basePrisma.pairingCode.create({
    data: { code, familyId: member.familyId, role: inviteRole, expiresAt },
  });

  return NextResponse.json({ code, expiresAt, role: inviteRole }, { status: 201 });
}
