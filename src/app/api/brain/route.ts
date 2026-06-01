import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateStr } from "@/lib/dateUtils";
import { subDays } from "date-fns";
import type { BrainType } from "@/lib/optis";

export const dynamic = "force-dynamic";

// AIブレイン: 過去30日の支出パターンから性格タイプを算出
export async function GET() {
  const since = toDateStr(subDays(new Date(), 29));
  const txs = await prisma.transaction.findMany({
    where: { type: "EXPENSE", date: { gte: since } },
    orderBy: { date: "asc" },
  });

  if (txs.length === 0) {
    return NextResponse.json({ brainType: "BALANCED" as BrainType, stats: null });
  }

  let needs = 0, wants = 0;
  const categoryDates: Record<string, string[]> = {};
  for (const t of txs) {
    if (t.needsWants === "NEEDS") needs += t.amount;
    else if (t.needsWants === "WANTS") wants += t.amount;
    const cat = t.category ?? "その他";
    categoryDates[cat] = categoryDates[cat] ?? [];
    categoryDates[cat].push(t.date);
  }

  const total = needs + wants;
  const needsRatio = total > 0 ? needs / total : 0.5;

  // 衝動買い指標: 同カテゴリを2日以内に再購入した率
  let impulseCount = 0;
  for (const dates of Object.values(categoryDates)) {
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const cur = new Date(dates[i]);
      if ((cur.getTime() - prev.getTime()) / 86400000 <= 2) impulseCount++;
    }
  }
  const impulseRate = txs.length > 1 ? impulseCount / (txs.length - 1) : 0;

  // 日付間隔の平均
  const dates = txs.map(t => new Date(t.date).getTime());
  let totalGap = 0;
  for (let i = 1; i < dates.length; i++) totalGap += (dates[i] - dates[i - 1]) / 86400000;
  const avgGap = dates.length > 1 ? totalGap / (dates.length - 1) : 7;

  // 保留(HOLD)おねだりの数
  const holds = await prisma.presentationRequest.count({ where: { status: "HOLD" } });

  let brainType: BrainType;
  if (needsRatio >= 0.65) {
    brainType = "FRUGAL";
  } else if (impulseRate >= 0.35 && needsRatio < 0.45) {
    brainType = "IMPULSIVE";
  } else if (avgGap >= 3 || holds > 0) {
    brainType = "ANALYTICAL";
  } else {
    brainType = "BALANCED";
  }

  return NextResponse.json({
    brainType,
    stats: {
      needsRatio: Math.round(needsRatio * 100),
      impulseRate: Math.round(impulseRate * 100),
      avgGap: Math.round(avgGap * 10) / 10,
      txCount: txs.length,
    },
  });
}
