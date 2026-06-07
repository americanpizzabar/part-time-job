import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENRE_META, QuizGenre } from "@/lib/optis";
import { toDateStr } from "@/lib/dateUtils";
import { subYears } from "date-fns";

export const dynamic = "force-dynamic";

// range → 集計開始日("YYYY-MM-DD"; all は null)
function cutoffFor(range: string | null): string | null {
  if (range === "all") return null;
  if (range === "3y") return toDateStr(subYears(new Date(), 3));
  // default = 1y
  return toDateStr(subYears(new Date(), 1));
}

// CSVフィールドのエスケープ: カンマ・引用符・改行を含む場合は引用符で囲み、
// 内部の引用符は2重化する。
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

  const [transactions, mercari, quizAttempts] = await Promise.all([
    prisma.transaction.findMany({ where: dateFilter, orderBy: { date: "asc" } }),
    prisma.mercariSale.findMany({ where: dateFilter, orderBy: { date: "asc" } }),
    prisma.quizAttempt.findMany({
      where: cutoff ? { createdAt: { gte: new Date(cutoff) } } : {},
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

  // --- ジャンル別正答率 ---
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
  lines.push(row(["クイズ正答率", `${quizAccuracyPct}%`]));
  lines.push("");

  // ── 取引明細 ──
  lines.push("【取引明細】");
  lines.push(row(["date", "type", "amount", "needsWants", "assetCategory", "category", "memo", "source"]));
  for (const t of transactions) {
    lines.push(
      row([
        t.date,
        t.type,
        t.amount,
        t.needsWants ?? "",
        t.assetCategory ?? "",
        t.category ?? "",
        t.memo ?? "",
        t.source,
      ])
    );
  }
  lines.push("");

  // ── メルカリ実績 ──
  lines.push("【メルカリ実績】");
  lines.push(row(["date", "itemName", "amount"]));
  for (const m of mercari) {
    lines.push(row([m.date, m.itemName ?? "", m.amount]));
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

  // Excel(日本語)向けにBOMを付与
  const csv = "﻿" + lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="optis-lifedata.csv"',
    },
  });
}
