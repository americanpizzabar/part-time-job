import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentISOWeek } from "@/lib/optis";
import { GCOIN_BUDGET_CLEAR } from "@/lib/optis";
import { getOptisState } from "@/lib/optisServer";

export const dynamic = "force-dynamic";

// action: CHECK_BUDGET (メンバーの予算達成をマーク) | LEAVE (脱退)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (body.action === "CHECK_BUDGET") {
    const week = currentISOWeek();
    const member = await prisma.guildMembership.update({
      where: { id: Number(id) },
      data: { budgetMetWeek: week },
    });

    // 全員達成チェック → ギルドオーラ解放 & Gコインボーナス
    const guild = await prisma.guild.findFirst({
      where: { members: { some: { id: Number(id) } } },
      include: { members: true },
    });
    const allMet = guild && guild.members.length >= 2 &&
      guild.members.every(m => m.budgetMetWeek === week || m.id === Number(id));

    if (allMet) {
      const state = await getOptisState();
      await prisma.optisState.update({
        where: { id: state.id },
        data: { gcoins: state.gcoins + GCOIN_BUDGET_CLEAR },
      });
    }
    return NextResponse.json({ member, allMet: !!allMet });
  }

  if (body.action === "LEAVE") {
    await prisma.guildMembership.delete({ where: { id: Number(id) } });
    // ギルドが空になったら削除
    const guild = await prisma.guild.findFirst({
      where: { members: { some: {} } },
      include: { _count: { select: { members: true } } },
    });
    if (guild && guild._count.members === 0) {
      await prisma.guild.delete({ where: { id: guild.id } });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ギルドごと削除(オーナーのみ)
  await prisma.guild.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
