import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseOptions(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const attempts = await prisma.quizAttempt.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      correct: true,
      selectedIndex: true,
      layer: true,
      genre: true,
      questionText: true,
      expGained: true,
      responseMs: true,
      quizId: true,
    },
  });

  const quizIds = [...new Set(attempts.map((a) => a.quizId))];
  const quizzes = await prisma.newsQuiz.findMany({
    where: { id: { in: quizIds } },
    select: { id: true, question: true, options: true, correctIndex: true, explanation: true },
  });
  const quizMap = new Map(quizzes.map((q) => [q.id, q]));

  const rows = attempts.map((a) => {
    const quiz = quizMap.get(a.quizId);
    if (!quiz) {
      return {
        id: a.id,
        date: a.createdAt,
        correct: a.correct,
        layer: a.layer,
        genre: a.genre,
        questionText: a.questionText,
        selectedAnswer: null,
        correctAnswer: null,
        explanation: null,
      };
    }
    const options = parseOptions(quiz.options);
    return {
      id: a.id,
      date: a.createdAt,
      correct: a.correct,
      layer: a.layer,
      genre: a.genre,
      questionText: a.questionText ?? quiz.question,
      selectedAnswer: options[a.selectedIndex] ?? null,
      correctAnswer: options[quiz.correctIndex] ?? null,
      explanation: quiz.explanation,
    };
  });

  return NextResponse.json({ rows });
}
