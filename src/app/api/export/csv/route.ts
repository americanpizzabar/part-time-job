import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENRE_META, QuizGenre } from "@/lib/optis";
import { toDateStr } from "@/lib/dateUtils";
import { subYears } from "date-fns";

export const dynamic = "force-dynamic";

function cutoffFor(range: string | null): string | null {
  if (range === "all") return null;
  if (range === "3y") return toDateStr(subYears(new Date(), 3));
  return toDateStr(subYears(new Date(), 1));
}

function esc(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: unknown[]): string {
  return cells.map(esc).join(",");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "1y";
  const cutoff = cutoffFor(range);
  const dateFilter = cutoff ? { date: { gte: cutoff } } : {};
  const dateFilterCreated = cutoff ? { createdAt: { gte: new Date(cutoff) } } : {};

  const [
    transactions,
    mercari,
    quizAttempts,
    choreLogs,
    allowancePeriods,
    savingsGoals,
    fundTxs,
  ] = await Promise.all([
    prisma.transaction.findMany({ where: dateFilter, orderBy: { date: "asc" } }),
    prisma.mercariSale.findMany({ where: dateFilter, orderBy: { date: "asc" } }),
    prisma.quizAttempt.findMany({
      where: cutoff ? { createdAt: { gte: new Date(cutoff) } } : {},
      include: { quiz: { select: { question: true, genre: true, layer: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.choreLog.findMany({
      where: { ...dateFilter, completed: true },
      include: { chore: { select: { name: true, amount: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.allowancePeriod.findMany({
      where: cutoff ? { startDate: { gte: cutoff } } : {},
      orderBy: { startDate: "asc" },
    }),
    prisma.savingsGoal.findMany({
      include: {
        contributions: {
          where: dateFilter,
          orderBy: { date: "asc" },
        },
      },
    }),
    prisma.indexFundTx.findMany({
      where: dateFilter,
      orderBy: { date: "asc" },
    }),
  ]);

  // --- サマリー集計 ---
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
  const mercariTotal = mercari.reduce((s, m) => s + m.amount, 0);
  const quizCorrect = quizAttempts.filter((a) => a.correct).length;
  const quizAccuracyPct =
    quizAttempts.length > 0 ? Math.round((quizCorrect / quizAttempts.length) * 100) : 0;
  const choreEarned = choreLogs.reduce((s, l) => s + (l.chore?.amount ?? 0), 0);
  const allowancePaid = allowancePeriods
    .filter((p) => p.isPaid)
    .reduce((s, p) => s + p.totalAmount, 0);

  // ジャンル別正答率
  const genreStats = new Map<string, { total: number; correct: number }>();
  for (const a of quizAttempts) {
    const g = genreStats.get(a.genre) ?? { total: 0, correct: 0 };
    g.total += 1;
    if (a.correct) g.correct += 1;
    genreStats.set(a.genre, g);
  }

  const lines: string[] = [];

  // ── サマリー ──
  lines.push("【サマリー】");
  lines.push(row(["項目", "値"]));
  lines.push(row(["総収入", totalIncome]));
  lines.push(row(["総支出", totalExpense]));
  lines.push(row(["NEEDS合計", needsTotal]));
  lines.push(row(["WANTS合計", wantsTotal]));
  lines.push(row(["メルカリ売上累計", mercariTotal]));
  lines.push(row(["お手伝い稼ぎ累計", choreEarned]));
  lines.push(row(["お小遣い受取累計(支払済)", allowancePaid]));
  lines.push(row(["クイズ正答率", `${quizAccuracyPct}%`]));
  lines.push(row(["クイズ回答数", quizAttempts.length]));
  lines.push("");

  // ── 取引明細 ──
  lines.push("【取引明細】");
  lines.push(row(["date", "type", "amount", "needsWants", "assetCategory", "category", "memo", "source"]));
  for (const t of transactions) {
    lines.push(row([t.date, t.type, t.amount, t.needsWants ?? "", t.assetCategory ?? "", t.category ?? "", t.memo ?? "", t.source]));
  }
  lines.push("");

  // ── お手伝いログ ──
  lines.push("【お手伝いログ】");
  lines.push(row(["date", "choreName", "amount", "isExtra"]));
  for (const l of choreLogs) {
    lines.push(row([l.date, l.chore?.name ?? "", l.chore?.amount ?? 0, l.isExtra ? "extra" : ""]));
  }
  lines.push("");

  // ── お小遣い集計 ──
  lines.push("【お小遣い集計】");
  lines.push(row(["startDate", "endDate", "baseAmount", "choreAmount", "totalAmount", "isPaid", "paidAt"]));
  for (const p of allowancePeriods) {
    lines.push(row([p.startDate, p.endDate, p.baseAmount, p.choreAmount, p.totalAmount, p.isPaid ? "支払済" : "未払い", p.paidAt ? new Date(p.paidAt).toISOString().slice(0, 10) : ""]));
  }
  lines.push("");

  // ── メルカリ実績 ──
  lines.push("【メルカリ実績】");
  lines.push(row(["date", "itemName", "amount"]));
  for (const m of mercari) {
    lines.push(row([m.date, m.itemName ?? "", m.amount]));
  }
  lines.push("");

  // ── 目標貯蓄 ──
  lines.push("【目標貯蓄】");
  lines.push(row(["goalName", "targetAmount", "deadline", "isAchieved", "date", "contributionAmount", "memo"]));
  for (const g of savingsGoals) {
    if (g.contributions.length === 0) {
      lines.push(row([g.name, g.targetAmount, g.deadline ?? "", g.isAchieved ? "達成" : "進行中", "", "", ""]));
    } else {
      for (const c of g.contributions) {
        lines.push(row([g.name, g.targetAmount, g.deadline ?? "", g.isAchieved ? "達成" : "進行中", c.date, c.amount, c.memo ?? ""]));
      }
    }
  }
  lines.push("");

  // ── ファンド取引 ──
  lines.push("【ジュニア・ファンド取引】");
  lines.push(row(["date", "type", "amount", "memo"]));
  for (const f of fundTxs) {
    const typeLabel: Record<string, string> = { INVEST: "投資", WITHDRAW: "引出", RETURN: "リターン", PARENT_BONUS: "親ボーナス" };
    lines.push(row([f.date, typeLabel[f.type] ?? f.type, f.amount, f.memo ?? ""]));
  }
  lines.push("");

  // ── クイズ正答率(ジャンル別) ──
  lines.push("【クイズ正答率(ジャンル別)】");
  lines.push(row(["genre", "label", "total", "correct", "accuracy%"]));
  for (const [genre, s] of genreStats.entries()) {
    const label = GENRE_META[genre as QuizGenre]?.label ?? genre;
    const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    lines.push(row([genre, label, s.total, s.correct, `${acc}%`]));
  }
  lines.push("");

  // ── クイズ回答履歴 ──
  lines.push("【クイズ回答履歴】");
  lines.push(row(["date", "genre", "layer", "question", "correct", "responseMs"]));
  for (const a of quizAttempts) {
    const question = a.questionText ?? a.quiz?.question ?? "";
    const genre = GENRE_META[a.genre as QuizGenre]?.label ?? a.genre;
    const dateStr = a.createdAt.toISOString().slice(0, 10);
    lines.push(row([dateStr, genre, a.layer, question, a.correct ? "正解" : "不正解", a.responseMs ?? ""]));
  }

  const csv = "﻿" + lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="optis-lifedata.csv"',
    },
  });
}
