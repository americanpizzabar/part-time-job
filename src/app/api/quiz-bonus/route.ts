import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentWeekRange } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

// 今週のデイリー報酬クイズ・ボーナスのサマリーを返す(親のレポート表示用)。
// ボーナス自体はその日のお手伝いに自動加算され、お小遣い集計に含まれる。
export async function GET() {
  const config = await prisma.aggregationConfig.findFirst({ orderBy: { id: "asc" } });
  const { start, end } = currentWeekRange(config?.startDayOfWeek ?? 1);
  const week = await prisma.quizBonusEarning.findMany({
    where: { earnedDate: { gte: start, lte: end } },
    orderBy: { earnedDate: "asc" },
  });
  const total = week.reduce((s, e) => s + e.amount, 0);
  const hardPodCount = week.filter(e => e.isHardPod).length;
  return NextResponse.json({
    pendingTotal: total,
    correctCount: week.length,
    hardPodCount,
    firstDate: week[0]?.earnedDate ?? null,
    lastDate: week[week.length - 1]?.earnedDate ?? null,
    weekStart: start,
    weekEnd: end,
  });
}
