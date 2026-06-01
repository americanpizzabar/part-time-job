import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();

  // Get the latest active quiz
  const quiz = await prisma.newsQuiz.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  // Check if user has an active shield
  const shieldAttempt = await prisma.quizAttempt.findFirst({
    where: {
      correct: true,
      shieldUntil: { gt: now },
    },
    orderBy: { shieldUntil: "desc" },
  });

  const hasShield = !!shieldAttempt;
  const shieldUntil = shieldAttempt?.shieldUntil ?? null;

  if (!quiz) {
    return NextResponse.json({ quiz: null, hasShield, shieldUntil });
  }

  // Parse options
  let options: string[] = [];
  try {
    options = JSON.parse(quiz.options);
  } catch {
    options = [];
  }

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      question: quiz.question,
      options,
      weatherType: quiz.weatherType,
      explanation: quiz.explanation,
    },
    hasShield,
    shieldUntil,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { question, options, correctIndex, explanation, weatherType } = body as {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    weatherType?: string;
  };

  if (!question || !options || options.length !== 3 || correctIndex === undefined || !explanation) {
    return NextResponse.json({ error: "question, options (3), correctIndex, explanation are required" }, { status: 400 });
  }

  // Deactivate old quizzes
  await prisma.newsQuiz.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const quiz = await prisma.newsQuiz.create({
    data: {
      question,
      options: JSON.stringify(options),
      correctIndex,
      explanation,
      weatherType: weatherType ?? "NEUTRAL",
      isActive: true,
    },
  });

  return NextResponse.json(quiz, { status: 201 });
}
