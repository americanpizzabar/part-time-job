import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const missionId = parseInt(id, 10);
  if (isNaN(missionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const { selectedIndex } = body as { selectedIndex: number };

  const mission = await prisma.wordMission.findUnique({ where: { id: missionId } });
  if (!mission) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mission.solvedAt) return NextResponse.json({ error: "Already solved" }, { status: 400 });

  const correct = selectedIndex === mission.correctIndex;
  let expGained = 0;

  if (correct) {
    expGained = mission.expReward;
    const state = await getOptisState();
    await prisma.optisState.update({
      where: { id: state.id },
      data: { experience: state.experience + expGained },
    });
    await prisma.wordMission.update({
      where: { id: missionId },
      data: { solvedAt: new Date() },
    });
  }

  return NextResponse.json({ correct, expGained, word: mission.word, translation: mission.translation });
}
