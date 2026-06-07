import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ASSET_META, AssetCategory, GENRE_META, QuizGenre } from "@/lib/optis";
import { toDateStr, today } from "@/lib/dateUtils";
import { subYears } from "date-fns";

export const dynamic = "force-dynamic";

function cutoffFor(range: string | null): string | null {
  if (range === "all") return null;
  if (range === "3y") return toDateStr(subYears(new Date(), 3));
  return toDateStr(subYears(new Date(), 1)); // default 1y
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "1y";
  const cutoff = cutoffFor(range);
  const dateFilter = cutoff ? { date: { gte: cutoff } } : {};

  const [transactions, mercari, quizAttempts] = await Promise.all([
    prisma.transaction.findMany({ where: dateFilter }),
    prisma.mercariSale.findMany({ where: dateFilter, orderBy: { date: "desc" } }),
    prisma.quizAttempt.findMany({
      where: cutoff ? { createdAt: { gte: new Date(cutoff) } } : {},
    }),
  ]);

  // --- サマリー ---
  let totalIncome = 0;
  let totalExpense = 0;
  let needsTotal = 0;
  let wantsTotal = 0;
  for (const t of transactions) {
    if (t.type === "INCOME") totalIncome += t.amount;
    else {
      totalExpense += t.amount;
      if (t.needsWants === "NEEDS") needsTotal += t.amount;
      else if (t.needsWants === "WANTS") wantsTotal += t.amount;
    }
  }
  const needsRatio = totalExpense > 0 ? Math.round((needsTotal / totalExpense) * 100) : 0;

  // --- assetBreakdown: NEEDS を assetCategory 別に集計 ---
  const assetTotals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === "EXPENSE" && t.needsWants === "NEEDS" && t.assetCategory) {
      assetTotals.set(t.assetCategory, (assetTotals.get(t.assetCategory) ?? 0) + t.amount);
    }
  }
  const assetBreakdown = (Object.keys(ASSET_META) as AssetCategory[]).map((cat) => {
    const total = assetTotals.get(cat) ?? 0;
    const meta = ASSET_META[cat];
    return {
      category: cat,
      label: meta.label,
      emoji: meta.emoji,
      color: meta.color,
      total,
      pct: needsTotal > 0 ? Math.round((total / needsTotal) * 100) : 0,
    };
  });

  // --- mercari ---
  const mercariSum = mercari.reduce((s, m) => s + m.amount, 0);
  const mercariBlock = {
    total: mercariSum,
    count: mercari.length,
    items: mercari.map((m) => ({ date: m.date, itemName: m.itemName, amount: m.amount })),
  };

  // --- quizAccuracy: ジャンル別 + 全体 ---
  const genreStats = new Map<string, { total: number; correct: number }>();
  for (const a of quizAttempts) {
    const g = genreStats.get(a.genre) ?? { total: 0, correct: 0 };
    g.total += 1;
    if (a.correct) g.correct += 1;
    genreStats.set(a.genre, g);
  }
  const perGenre = [...genreStats.entries()].map(([genre, s]) => ({
    genre,
    label: GENRE_META[genre as QuizGenre]?.label ?? genre,
    total: s.total,
    correct: s.correct,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
  }));
  const overallCorrect = quizAttempts.filter((a) => a.correct).length;
  const quizAccuracy = {
    perGenre,
    overall: {
      total: quizAttempts.length,
      correct: overallCorrect,
      accuracy:
        quizAttempts.length > 0 ? Math.round((overallCorrect / quizAttempts.length) * 100) : 0,
    },
  };

  return NextResponse.json({
    assetBreakdown,
    mercari: mercariBlock,
    quizAccuracy,
    summary: {
      totalIncome,
      totalExpense,
      needsTotal,
      wantsTotal,
      needsRatio,
      period: { from: cutoff, to: today() },
    },
  });
}
