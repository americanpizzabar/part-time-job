import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";
import { QUIZ_SHIELD_DAYS, QUIZ_CORRECT_EXP } from "@/lib/optis";
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
  let shieldUntil: Date | null = null;
  let expGained = 0;

  if (correct) {
    shieldUntil = new Date(Date.now() + QUIZ_SHIELD_DAYS * 24 * 60 * 60 * 1000);
    expGained = QUIZ_CORRECT_EXP;

    // Award EXP
    const state = await getOptisState();
    await prisma.optisState.update({
      where: { id: state.id },
      data: { experience: state.experience + expGained },
    });
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
    layerChanged: calibration.layerChanged,
    newLayer: calibration.newLayer,
    layerDialogue,
    accuracy: calibration.accuracy,
  });
}
