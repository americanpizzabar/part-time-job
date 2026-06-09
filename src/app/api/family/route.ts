import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { basePrisma, MEMBER_COOKIE, DEFAULT_FAMILY_ID } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365, // 1年
  path: "/",
};

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
// - 既に登録済みなら現状を返す
// - default-family が無主(メンバー0)なら、この端末が親として引き継ぐ
//   (既存シングル家族デプロイからの移行パス)
// - それ以外は新しい家族コンテナを作成して親として登録
export async function POST(req: Request) {
  const existing = await currentMember();
  if (existing) {
    return NextResponse.json({
      ok: true,
      member: { id: existing.id, role: existing.role, nickname: existing.nickname },
      familyId: existing.familyId,
      claimed: false,
    });
  }

  const body = await req.json().catch(() => ({}));
  const nickname = typeof body.nickname === "string" && body.nickname.trim()
    ? body.nickname.trim() : "おうちの人";

  const token = randomBytes(32).toString("hex");

  // default-family にまだ誰もいなければ引き継ぐ(既存データの所有権)
  const defaultFamily = await basePrisma.family.findUnique({
    where: { id: DEFAULT_FAMILY_ID },
    include: { _count: { select: { members: true } } },
  });

  let familyId: string;
  let claimed = false;
  if (defaultFamily && defaultFamily._count.members === 0) {
    familyId = DEFAULT_FAMILY_ID;
    claimed = true;
  } else {
    const family = await basePrisma.family.create({ data: {} });
    familyId = family.id;
  }

  const member = await basePrisma.familyMember.create({
    data: { familyId, role: "PARENT", nickname, token },
  });

  const store = await cookies();
  store.set(MEMBER_COOKIE, token, COOKIE_OPTS);

  return NextResponse.json({
    ok: true,
    member: { id: member.id, role: member.role, nickname: member.nickname },
    familyId,
    claimed,
  }, { status: 201 });
}
