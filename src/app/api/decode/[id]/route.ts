import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";
import { getPart } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const missionId = parseInt(id, 10);
  if (isNaN(missionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const { selectedIndex } = body as { selectedIndex: number };

  const mission = await prisma.decodeMission.findUnique({ where: { id: missionId } });
  if (!mission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const correct = selectedIndex === mission.correctIndex;

  if (!correct) {
    return NextResponse.json({ correct: false, explanation: mission.explanation });
  }

  // 初回正解のみ報酬を付与(再回答では報酬なし)
  const firstSolve = !mission.solvedAt;
  let expGained = 0;
  let gcoinGained = 0;
  let unlockedPart: { id: string; name: string; emoji?: string } | null = null;

  if (firstSolve) {
    const state = await getOptisState();
    const unlocked = parseUnlocked(state.unlockedParts);
    expGained = mission.expReward;
    gcoinGained = mission.gcoinReward;

    let newUnlocked = unlocked;
    if (mission.rewardPartId && !unlocked.includes(mission.rewardPartId)) {
      const part = getPart(mission.rewardPartId);
      if (part) {
        newUnlocked = [...unlocked, mission.rewardPartId];
        unlockedPart = { id: part.id, name: part.name, emoji: part.emoji };
      }
    }

    await prisma.optisState.update({
      where: { id: state.id },
      data: {
        experience: state.experience + expGained,
        gcoins: state.gcoins + gcoinGained,
        ...(newUnlocked !== unlocked ? { unlockedParts: JSON.stringify(newUnlocked) } : {}),
      },
    });
    await prisma.decodeMission.update({
      where: { id: missionId },
      data: { solvedAt: new Date() },
    });
  }

  return NextResponse.json({
    correct: true,
    explanation: mission.explanation,
    firstSolve,
    expGained,
    gcoinGained,
    unlockedPart,
  });
}
