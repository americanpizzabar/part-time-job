import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState, parseUnlocked, computeDerived } from "@/lib/optisServer";
import {
  mainframeCycleKey, pickMainframeProblem,
  MAINFRAME_TITLE_PART, MAINFRAME_EXP_REWARD, MAINFRAME_WISDOM_REWARD, getPart,
} from "@/lib/optis";

export const dynamic = "force-dynamic";

const MAINFRAME_MIN_LEVEL = 8; // ソロ最深部の解放レベル

// 現サイクルのメインフレーム問題と解答状況を返す(正解indexは隠す)。
export async function GET() {
  const state = await getOptisState();
  const derived = await computeDerived(state.experience, state.awakening, state.generation);
  const cycleKey = mainframeCycleKey();
  const problem = pickMainframeProblem(cycleKey);

  const solve = await prisma.mainframeSolve.findFirst({ where: { cycleKey } });
  const titlePart = getPart(MAINFRAME_TITLE_PART);
  const owned = parseUnlocked(state.unlockedParts).includes(MAINFRAME_TITLE_PART);

  return NextResponse.json({
    cycleKey,
    unlocked: derived.level >= MAINFRAME_MIN_LEVEL,
    minLevel: MAINFRAME_MIN_LEVEL,
    level: derived.level,
    solved: !!solve?.correct,
    problem: {
      question: problem.question,
      options: problem.options,
      // 解答済みのときだけ解説を返す
      explanation: solve?.correct ? problem.explanation : null,
    },
    titlePart: titlePart
      ? { id: titlePart.id, name: titlePart.name, emoji: titlePart.emoji ?? "🛡️", rarity: titlePart.rarity, owned }
      : null,
  });
}

// 1タップ採点。正解でソロ称号パーツ付与 + 大量EXP/wisdom。
export async function POST(req: Request) {
  const state = await getOptisState();
  const derived = await computeDerived(state.experience, state.awakening, state.generation);
  if (derived.level < MAINFRAME_MIN_LEVEL) {
    return NextResponse.json({ error: `Lv.${MAINFRAME_MIN_LEVEL} 以上で解放されます` }, { status: 400 });
  }

  const body = await req.json();
  const { selectedIndex } = body as { selectedIndex: number };
  const cycleKey = mainframeCycleKey();
  const problem = pickMainframeProblem(cycleKey);

  const existing = await prisma.mainframeSolve.findFirst({ where: { cycleKey } });
  if (existing?.correct) {
    return NextResponse.json({ error: "このサイクルは攻略済みです", correct: true }, { status: 400 });
  }

  const correct = selectedIndex === problem.correctIndex;

  if (existing) {
    await prisma.mainframeSolve.update({ where: { id: existing.id }, data: { correct } });
  } else {
    await prisma.mainframeSolve.create({ data: { cycleKey, correct } });
  }

  let newPart = false;
  if (correct) {
    const unlocked = parseUnlocked(state.unlockedParts);
    if (!unlocked.includes(MAINFRAME_TITLE_PART)) {
      unlocked.push(MAINFRAME_TITLE_PART);
      newPart = true;
    }
    await prisma.optisState.update({
      where: { id: state.id },
      data: {
        unlockedParts: JSON.stringify(unlocked),
        experience: state.experience + MAINFRAME_EXP_REWARD,
        wisdomPoints: state.wisdomPoints + MAINFRAME_WISDOM_REWARD,
      },
    });
    const part = getPart(MAINFRAME_TITLE_PART);
    await prisma.rewardLog.create({
      data: {
        source: "MAINFRAME",
        rarity: part?.rarity ?? "LEGENDARY",
        rewardId: MAINFRAME_TITLE_PART,
        label: `HACK SUCCESS: ${part?.emoji ?? "🛡️"} ${part?.name ?? ""}`,
        date: new Date().toISOString().slice(0, 10),
      },
    });
  }

  return NextResponse.json({
    correct,
    explanation: problem.explanation,
    newPart,
    expGained: correct ? MAINFRAME_EXP_REWARD : 0,
    wisdomGained: correct ? MAINFRAME_WISDOM_REWARD : 0,
  });
}
