import { NextResponse } from "next/server";
import { prisma, resolveFamilyId } from "@/lib/prisma";
import { currentISOWeek } from "@/lib/optis";
import { today } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

function makeCode(len = 6) {
  return Array.from({ length: len }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
}

export async function GET() {
  const guild = await prisma.guild.findFirst({
    orderBy: { id: "asc" },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });
  if (!guild) return NextResponse.json(null);

  const week = currentISOWeek();
  const allMet = guild.members.length >= 2 && guild.members.every(m => m.budgetMetWeek === week);
  return NextResponse.json({ ...guild, week, allMet });
}

export async function POST(req: Request) {
  const { name, nickname } = await req.json();
  if (!name?.trim() || !nickname?.trim()) {
    return NextResponse.json({ error: "ギルド名とニックネームが必要です" }, { status: 400 });
  }
  const existing = await prisma.guild.findFirst();
  if (existing) return NextResponse.json({ error: "すでにギルドがあります" }, { status: 409 });

  let inviteCode = makeCode();
  while (await prisma.guild.findUnique({ where: { inviteCode } })) inviteCode = makeCode();

  const guild = await prisma.guild.create({
    data: {
      name: name.trim(),
      inviteCode,
      // ネスト作成はテナントガードの自動注入が効かないため familyId を明示
      members: { create: { nickname: nickname.trim(), isOwner: true, budgetMetWeek: null, familyId: await resolveFamilyId() } },
    },
    include: { members: true },
  });
  return NextResponse.json(guild, { status: 201 });
}
