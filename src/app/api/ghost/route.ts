import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState, parseUnlocked, computeDerived, computeIntelScore } from "@/lib/optisServer";
import { currentISOWeek, generateGhost, ghostProgress, getPart, BRAIN_META, BrainType } from "@/lib/optis";

export const dynamic = "force-dynamic";

// 当週のシャドウ・チェイサー(AIライバル)を取得/生成し、両者スコアを返す。
export async function GET() {
  const state = await getOptisState();
  const derived = await computeDerived(state.experience, state.awakening, state.generation);
  const weekKey = currentISOWeek();

  let ghost = await prisma.shadowGhost.findFirst({ where: { weekKey } });
  if (!ghost) {
    const g = generateGhost(weekKey, derived.level);
    ghost = await prisma.shadowGhost.create({
      data: {
        weekKey,
        name: g.name,
        level: g.level,
        brainType: g.brainType,
        targetScore: g.targetScore,
        rewardPartId: g.rewardPartId,
      },
    });
  }

  const intel = await computeIntelScore();
  const oppProgress = ghostProgress(weekKey);
  const rewardPart = getPart(ghost.rewardPartId);
  const brain = BRAIN_META[ghost.brainType as BrainType] ?? BRAIN_META.BALANCED;
  // スコアがライバルの勝利ラインを超えていれば略奪可能(早期達成も許容)
  const isWeekend = new Date().getDay() === 0;
  const canClaim = !ghost.defeated && intel.score >= ghost.targetScore;

  return NextResponse.json({
    weekKey,
    ghost: {
      name: ghost.name,
      level: ghost.level,
      brainType: ghost.brainType,
      brainLabel: brain.label,
      brainEmoji: brain.emoji,
      targetScore: ghost.targetScore,
      progress: oppProgress,
      defeated: ghost.defeated,
    },
    me: {
      level: derived.level,
      score: intel.score,
      budgetScore: intel.budgetScore,
      quizScore: intel.quizScore,
    },
    rewardPart: rewardPart
      ? { id: rewardPart.id, name: rewardPart.name, emoji: rewardPart.emoji ?? "✨", rarity: rewardPart.rarity, owned: parseUnlocked(state.unlockedParts).includes(rewardPart.id) }
      : null,
    canClaim,
    isWeekend,
  });
}

// 勝利時の略奪: ライバルの限定パーツを奪う(unlockedParts へ追加)。
export async function POST() {
  const state = await getOptisState();
  const weekKey = currentISOWeek();
  const ghost = await prisma.shadowGhost.findFirst({ where: { weekKey } });
  if (!ghost) {
    return NextResponse.json({ error: "今週のライバルがまだ出現していません" }, { status: 400 });
  }
  if (ghost.defeated) {
    return NextResponse.json({ error: "今週はすでに略奪済みです" }, { status: 400 });
  }

  const intel = await computeIntelScore();
  if (intel.score < ghost.targetScore) {
    return NextResponse.json({ error: "スコアがライバルに届いていません", score: intel.score, target: ghost.targetScore }, { status: 400 });
  }

  const unlocked = parseUnlocked(state.unlockedParts);
  let newPart = false;
  if (!unlocked.includes(ghost.rewardPartId)) {
    unlocked.push(ghost.rewardPartId);
    newPart = true;
    await prisma.optisState.update({
      where: { id: state.id },
      data: { unlockedParts: JSON.stringify(unlocked) },
    });
  }

  await prisma.shadowGhost.update({
    where: { id: ghost.id },
    data: { defeated: true, claimedAt: new Date() },
  });

  const part = getPart(ghost.rewardPartId);
  await prisma.rewardLog.create({
    data: {
      source: "GHOST",
      rarity: part?.rarity ?? "RARE",
      rewardId: ghost.rewardPartId,
      label: `略奪: ${part?.emoji ?? "✨"} ${part?.name ?? ghost.rewardPartId}`,
      date: new Date().toISOString().slice(0, 10),
    },
  });

  return NextResponse.json({
    ok: true,
    newPart,
    part: part ? { id: part.id, name: part.name, emoji: part.emoji ?? "✨", rarity: part.rarity } : null,
  });
}
