import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { basePrisma, MEMBER_COOKIE } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

// リカバリーコード: 読みやすい大文字英数字 16 文字(O/0/I/1/L を除外)
function generateRecoveryCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function currentMember() {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  return basePrisma.familyMember.findUnique({
    where: { token },
    include: { family: { include: { members: { orderBy: { createdAt: "asc" } } } } },
  });
}

// GET: 現在の所属家族とメンバー一覧
export async function GET() {
  const member = await currentMember();
  if (!member) return NextResponse.json({ member: null, family: null });
  return NextResponse.json({
    member: { id: member.id, role: member.role, nickname: member.nickname },
    family: {
      id: member.familyId,
      name: member.family.name,
      members: member.family.members.map(m => ({
        id: m.id, role: m.role, nickname: m.nickname, createdAt: m.createdAt,
      })),
    },
  });
}

// POST: 初期セットアップ(この端末を家族に登録)
export async function POST(req: Request) {
  const existing = await currentMember();
  if (existing) {
    return NextResponse.json({
      ok: true,
      member: { id: existing.id, role: existing.role, nickname: existing.nickname },
      familyId: existing.familyId,
    });
  }

  const body = await req.json().catch(() => ({}));
  const nickname = typeof body.nickname === "string" && body.nickname.trim()
    ? body.nickname.trim() : "おうちの人";

  const recoveryCode = generateRecoveryCode();
  const recoveryCodeHash = await bcrypt.hash(recoveryCode, 10);

  const token = randomBytes(32).toString("hex");
  const family = await basePrisma.family.create({ data: { recoveryCodeHash } });
  const member = await basePrisma.familyMember.create({
    data: { familyId: family.id, role: "PARENT", nickname, token },
  });

  const store = await cookies();
  store.set(MEMBER_COOKIE, token, COOKIE_OPTS);

  // recoveryCode は平文をここで1度だけ返す。DB には保存しない。
  return NextResponse.json({
    ok: true,
    member: { id: member.id, role: member.role, nickname: member.nickname },
    familyId: family.id,
    recoveryCode,
  }, { status: 201 });
}
