import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENRE_META, QuizGenre } from "@/lib/optis";

export const dynamic = "force-dynamic";

const GENRES: QuizGenre[] = ["CURRENT", "ECONOMY", "ENGLISH", "LOGIC"];

export async function GET() {
  const attempts = await prisma.quizAttempt.findMany({
    select: { genre: true, correct: true },
  });

  const genres = GENRES.map((genre) => {
    const rows = attempts.filter((a) => a.genre === genre);
    const total = rows.length;
    const correct = rows.filter((a) => a.correct).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { genre, label: GENRE_META[genre].label, total, correct, accuracy };
  });

  const total = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return NextResponse.json({ genres, overall: { total, correct, accuracy } });
}
