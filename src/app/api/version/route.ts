import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAllowance } from "@/lib/allowanceCalc";

export const dynamic = "force-dynamic";

// 診断用: 稼働中のビルドのコミットSHAと、直近未払い期間のサーバー再計算結果を返す。
// クイズボーナスが集計に取り込まれているかを本番で直接確認するためのもの。
export async function GET() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_COMMIT_SHA ||
    "unknown";

  let diag: unknown = null;
  try {
    const period = await prisma.allowancePeriod.findFirst({
      where: { isPaid: false },
      orderBy: { startDate: "desc" },
    });
    if (period) {
      const calc = await calculateAllowance(period.startDate, period.endDate);
      const bonuses = await prisma.quizBonusEarning.findMany({
        where: { earnedDate: { gte: period.startDate, lte: period.endDate } },
      });
      diag = {
        period: { startDate: period.startDate, endDate: period.endDate },
        stored: { choreAmount: period.choreAmount, totalAmount: period.totalAmount, bonusAmount: period.bonusAmount },
        recomputedNow: { baseAmount: calc.baseAmount, choreAmount: calc.choreAmount, totalAmount: calc.totalAmount },
        quizBonus: { count: bonuses.length, total: bonuses.reduce((s, b) => s + b.amount, 0), dates: bonuses.map(b => b.earnedDate) },
        foldedIntoChore: "choreDetails" in calc ? !!calc.choreDetails["quizbonus"] : false,
      };
    }
  } catch (e) {
    diag = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({ commit: commit.slice(0, 7), diag });
}
