import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";
import { getPart } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const missionId = Number(id);
  const body = await req.json();
  const { action } = body as { action: "CLEAR" | "APPROVE" | "REJECT" };

  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "CLEAR") {
    const updated = await prisma.mission.update({
      where: { id: missionId },
      data: { status: "CLEARED", clearedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  if (action === "REJECT") {
    const updated = await prisma.mission.update({
      where: { id: missionId },
      data: { status: "REJECTED" },
    });
    return NextResponse.json(updated);
  }

  if (action === "APPROVE") {
    // 報酬付与: 現金→収入計上 / パーツ→アンロック
    if (mission.rewardType === "CASH" && mission.rewardCash) {
      await prisma.transaction.create({
        data: {
          type: "INCOME",
          amount: mission.rewardCash,
          date: today(),
          memo: `ミッション報酬: ${mission.title}`,
          source: "MANUAL",
        },
      });
    } else if (mission.rewardType === "PART" && mission.rewardPart) {
      const state = await getOptisState();
      const unlocked = parseUnlocked(state.unlockedParts);
      if (!unlocked.includes(mission.rewardPart) && getPart(mission.rewardPart)) {
        await prisma.optisState.update({
          where: { id: state.id },
          data: { unlockedParts: JSON.stringify([...unlocked, mission.rewardPart]) },
        });
      }
    }
    const updated = await prisma.mission.update({
      where: { id: missionId },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.mission.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
