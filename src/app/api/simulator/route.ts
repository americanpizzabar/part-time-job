import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateStr } from "@/lib/dateUtils";
import { subDays } from "date-fns";
import { projectProgress } from "@/lib/optis";

export const dynamic = "force-dynamic";

// バジェット・マトリクス: 過去の支出傾向から未来の達成速度を逆算する素データを返す
export async function GET() {
  const WINDOW = 30;
  const since = toDateStr(subDays(new Date(), WINDOW - 1));
  const txs = await prisma.transaction.findMany({
    where: { type: "EXPENSE", date: { gte: since } },
  });

  // カテゴリ別の集計
  const byCategory: Record<string, { total: number; count: number }> = {};
  let grandTotal = 0;
  for (const t of txs) {
    const c = t.category ?? "その他";
    byCategory[c] = byCategory[c] ?? { total: 0, count: 0 };
    byCategory[c].total += t.amount;
    byCategory[c].count += 1;
    grandTotal += t.amount;
  }

  const weeks = WINDOW / 7;
  const categories = Object.entries(byCategory).map(([name, v]) => ({
    name,
    total: v.total,
    count: v.count,
    perWeekAmount: Math.round(v.total / weeks),
    perWeekCount: Math.round((v.count / weeks) * 10) / 10,
    avgPerOccurrence: v.count > 0 ? Math.round(v.total / v.count) : 0,
  }));
  categories.sort((a, b) => b.total - a.total);

  const cfg = await prisma.aggregationConfig.findFirst({ orderBy: { id: "asc" } });
  const weeklyBudget = cfg?.weeklyBudget ?? 0;

  // 進行中プロジェクト(達成シミュレーション対象)
  const active = await prisma.project.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  const project = active
    ? {
        id: active.id,
        name: active.name,
        plannedAmount: active.plannedAmount,
        ...projectProgress(active),
      }
    : null;

  return NextResponse.json({
    windowDays: WINDOW,
    grandTotal,
    weeklySpend: Math.round(grandTotal / weeks),
    weeklyBudget,
    categories,
    project,
  });
}
