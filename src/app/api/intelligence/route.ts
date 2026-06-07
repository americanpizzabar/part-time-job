import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENRE_META, QuizGenre } from "@/lib/optis";

export const dynamic = "force-dynamic";

function genreLabel(genre: string): string {
  return GENRE_META[genre as QuizGenre]?.label ?? genre;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const genreFilter = searchParams.get("genre");

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      correct: true,
      ...(genreFilter ? { genre: genreFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  // 関連するNewsQuizをまとめて取得(quizId → quiz)
  const quizIds = [...new Set(attempts.map((a) => a.quizId))];
  const quizzes = quizIds.length
    ? await prisma.newsQuiz.findMany({ where: { id: { in: quizIds } } })
    : [];
  const quizMap = new Map(quizzes.map((q) => [q.id, q]));

  const archive = attempts.map((a) => {
    const quiz = quizMap.get(a.quizId);
    let correctAnswer = "";
    if (quiz) {
      try {
        const opts = JSON.parse(quiz.options) as string[];
        correctAnswer = opts[quiz.correctIndex] ?? "";
      } catch {
        correctAnswer = "";
      }
    }
    return {
      id: a.id,
      date: a.createdAt,
      genre: a.genre,
      genreLabel: genreLabel(a.genre),
      layer: a.layer,
      question: quiz?.question ?? a.questionText ?? "",
      correctAnswer,
      explanation: quiz?.explanation ?? "",
    };
  });

  // ジャンル別カウント
  const counts = new Map<string, number>();
  for (const a of attempts) {
    counts.set(a.genre, (counts.get(a.genre) ?? 0) + 1);
  }
  const byGenre = [...counts.entries()].map(([genre, count]) => ({
    genre,
    label: genreLabel(genre),
    count,
  }));

  return NextResponse.json({
    archive,
    byGenre,
    total: archive.length,
  });
}
