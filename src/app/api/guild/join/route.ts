import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { inviteCode, nickname } = await req.json();
  if (!inviteCode || !nickname?.trim()) {
    return NextResponse.json({ error: "招待コードとニックネームが必要です" }, { status: 400 });
  }
  const guild = await prisma.guild.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } });
  if (!guild) return NextResponse.json({ error: "招待コードが見つかりません" }, { status: 404 });

  const exists = await prisma.guildMembership.findUnique({
    where: { guildId_nickname: { guildId: guild.id, nickname: nickname.trim() } },
  });
  if (exists) return NextResponse.json({ error: "そのニックネームはすでに使われています" }, { status: 409 });

  await prisma.guildMembership.create({
    data: { guildId: guild.id, nickname: nickname.trim() },
  });
  const updated = await prisma.guild.findUnique({ where: { id: guild.id }, include: { members: true } });
  return NextResponse.json(updated, { status: 201 });
}
