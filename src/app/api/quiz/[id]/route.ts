import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";
import { today } from "@/lib/dateUtils";
import { QUIZ_SHIELD_DAYS, QUIZ_CORRECT_EXP, BLACK_POD_MIN_LAYER, computePodBonus } from "@/lib/optis";
import { getOrCreateLearningProfile, calibrateAfterAnswer, LAYER_UP_DIALOGUE, LAYER_DOWN_DIALOGUE } from "@/lib/learningEngine";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quizId = parseInt(id, 10);
  if (isNaN(quizId)) {
    return NextResponse.json({ error: "Invalid quiz id" }, { status: 400 });
  }

  const body = await req.json();
  const { selectedIndex, responseMs } = body as { selectedIndex: number; responseMs?: number };

  const quiz = await prisma.newsQuiz.findUnique({ where: { id: quizId } });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const correct = selectedIndex === quiz.correctIndex;
  const isHardPod = quiz.layer >= BLACK_POD_MIN_LAYER;
  let shieldUntil: Date | null = null;
  let expGained = 0;
  let bonusEarned = 0;

  if (correct) {
    shieldUntil = new Date(Date.now() + QUIZ_SHIELD_DAYS * 24 * 60 * 60 * 1000);
    expGained = QUIZ_CORRECT_EXP;

    // Award EXP
    const state = await getOptisState();
    await prisma.optisState.update({
      where: { id: state.id },
      data: { experience: state.experience + expGained },
    });

    // デイリー報酬クイズ: 親が単価を設定していればボーナスをプールへ加算(1日1件・冪等)
    const cfg = await prisma.aggregationConfig.findFirst({ orderBy: { id: "asc" } });
    bonusEarned = computePodBonus(
      cfg?.quizBonusPerCorrect ?? 0,
      cfg?.quizBonusHardBoost ?? 0,
      cfg?.quizBonusDailyCap ?? null,
      isHardPod,
    );
    if (bonusEarned > 0) {
      const earnedDate = today();
      const already = await prisma.quizBonusEarning.findFirst({ where: { earnedDate } });
      if (already) {
        bonusEarned = already.amount; // すでに当日分があれば二重加算しない
      } else {
        await prisma.quizBonusEarning.create({
          data: { amount: bonusEarned, isHardPod, earnedDate },
        });
      }
    }
  }

  const profile = await getOrCreateLearningProfile();

  await prisma.quizAttempt.create({
    data: {
      quizId,
      selectedIndex,
      correct,
      shieldUntil,
      expGained,
      responseMs: responseMs ?? null,
      layer: profile.layer,
      genre: quiz.genre,
      questionText: quiz.question,
    },
  });

  const calibration = await calibrateAfterAnswer(
    profile.id, profile.layer, profile.encounterRate,
    responseMs ?? null, correct, profile.parentAlertAt,
  );

  let layerDialogue: string | null = null;
  if (calibration.layerChanged) {
    if (calibration.newLayer > profile.layer) {
      layerDialogue = LAYER_UP_DIALOGUE[calibration.newLayer] ?? null;
    } else {
      layerDialogue = LAYER_DOWN_DIALOGUE;
    }
  }

  return NextResponse.json({
    correct,
    explanation: quiz.explanation,
    shieldUntil,
    expGained,
    bonusEarned,
    isHardPod,
    layerChanged: calibration.layerChanged,
    layerUp: calibration.layerUp,
    newLayer: calibration.newLayer,
    layerDialogue,
    accuracy: calibration.accuracy,
  });
}
