import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DECODE_SEED } from "@/lib/decodeSeed";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await prisma.decodeMission.count();
  if (count === 0) {
    await prisma.decodeMission.createMany({
      data: DECODE_SEED.map(m => ({
        kind: m.kind,
        title: m.title,
        brief: m.brief,
        dataset: m.dataset ?? null,
        question: m.question,
        choices: m.choices,
        correctIndex: m.correctIndex,
        explanation: m.explanation,
        expReward: m.expReward,
        gcoinReward: m.gcoinReward,
        rewardPartId: m.rewardPartId ?? null,
      })),
    });
  }

  const missions = await prisma.decodeMission.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  // 正解インデックスはクライアントに渡さない(サーバー側で検証する)
  const safe = missions.map(m => ({
    id: m.id,
    kind: m.kind,
    title: m.title,
    brief: m.brief,
    dataset: m.dataset,
    question: m.question,
    choices: m.choices,
    explanation: m.solvedAt ? m.explanation : null,
    expReward: m.expReward,
    gcoinReward: m.gcoinReward,
    rewardPartId: m.rewardPartId,
    solvedAt: m.solvedAt,
  }));

  return NextResponse.json(safe);
}
