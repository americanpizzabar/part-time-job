import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";

export const dynamic = "force-dynamic";

// action: APPROVE | REJECT
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action, parentNote } = await req.json();

  const report = await prisma.outcomeReport.findUnique({ where: { id: Number(id) } });
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (report.status !== "PENDING") return NextResponse.json({ error: "処理済みです" }, { status: 409 });

  if (action === "REJECT") {
    const updated = await prisma.outcomeReport.update({
      where: { id: Number(id) },
      data: { status: "REJECTED", parentNote: parentNote ?? null },
    });
    return NextResponse.json(updated);
  }

  if (action === "APPROVE") {
    const updated = await prisma.outcomeReport.update({
      where: { id: Number(id) },
      data: { status: "APPROVED", parentNote: parentNote ?? null, approvedAt: new Date() },
    });

    // 子供側: 報酬パーツを解放 + 信用スコアUP
    const state = await getOptisState();
    const unlocked = parseUnlocked(state.unlockedParts);
    const updates: Record<string, unknown> = {
      creditScore: Math.min(100, state.creditScore + 8),
    };
    if (report.rewardPart && !unlocked.includes(report.rewardPart)) {
      updates.unlockedParts = JSON.stringify([...unlocked, report.rewardPart]);
    }
    await prisma.optisState.update({ where: { id: state.id }, data: updates });

    return NextResponse.json({ ...updated, rewardPart: report.rewardPart });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
