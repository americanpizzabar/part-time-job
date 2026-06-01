import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";
import { QUIZ_SHIELD_DAYS, QUIZ_CORRECT_EXP } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quizId = parseInt(id, 10);
  if (isNaN(quizId)) {
    return NextResponse.json({ error: "Invalid quiz id" }, { status: 400 });
  }

  const body = await req.json();
  const { selectedIndex } = body as { selectedIndex: number };

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

  await prisma.quizAttempt.create({
    data: {
      quizId,
      selectedIndex,
      correct,
      shieldUntil,
      expGained,
    },
  });

  return NextResponse.json({
    correct,
    explanation: quiz.explanation,
    shieldUntil,
    expGained,
  });
}
