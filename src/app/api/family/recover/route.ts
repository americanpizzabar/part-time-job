import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { basePrisma, MEMBER_COOKIE, invalidateMemberCache } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

// POST: リカバリーコードで新端末を親として再登録
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase().replace(/\s/g, "") : "";
  const nickname = typeof body.nickname === "string" && body.nickname.trim()
    ? body.nickname.trim() : "おうちの人";

  if (code.length < 8) {
    return NextResponse.json({ error: "リカバリーコードを入力してください" }, { status: 400 });
  }

  // 全家族のハッシュと照合(家族数は少ないので全件取得で問題なし)
  const families = await basePrisma.family.findMany({
    where: { recoveryCodeHash: { not: null } },
    select: { id: true, recoveryCodeHash: true },
  });

  let matchedFamilyId: string | null = null;
  for (const f of families) {
    if (f.recoveryCodeHash && await bcrypt.compare(code, f.recoveryCodeHash)) {
      matchedFamilyId = f.id;
      break;
    }
  }

  if (!matchedFamilyId) {
    return NextResponse.json({ error: "リカバリーコードが正しくありません" }, { status: 400 });
  }

  const store = await cookies();
  const oldToken = store.get(MEMBER_COOKIE)?.value;

  const token = randomBytes(32).toString("hex");
  const member = await basePrisma.familyMember.create({
    data: { familyId: matchedFamilyId, role: "PARENT", nickname, token },
  });

  store.set(MEMBER_COOKIE, token, COOKIE_OPTS);
  if (oldToken) invalidateMemberCache(oldToken);

  return NextResponse.json({
    ok: true,
    member: { id: member.id, role: member.role, nickname: member.nickname },
    familyId: matchedFamilyId,
  }, { status: 201 });
}
