import { prisma } from "@/lib/prisma";
import { isChoreScheduledForDate, getDateRange } from "@/lib/dateUtils";

export interface ChoreBreakdown {
  name: string;
  amount: number;
  scheduled: number;
  completed: number;
}

export interface AllowanceCalcResult {
  baseAmount: number;
  choreAmount: number;
  totalAmount: number;
  choreDetails: Record<string, ChoreBreakdown>;
}

/**
 * 期間内のお小遣いを集計する。
 *
 * 重要: 「稼いだ金額」は完了ログの件数だけで決まる。
 * スケジュール状態を再構築してゲートすると、後からスケジュールを
 * 変更した単発タスクや isExtra フラグがズレたログが集計から漏れるため、
 * 完了ログそのものを正として数える。
 */
export async function calculateAllowance(
  startDate: string,
  endDate: string
): Promise<AllowanceCalcResult> {
  const allowanceConfig = await prisma.allowanceConfig.findFirst({
    orderBy: { createdAt: "desc" },
  });

  const chores = await prisma.chore.findMany({
    where: { isActive: true },
    include: {
      schedules: { where: { isActive: true } },
      logs: { where: { date: { gte: startDate, lte: endDate }, completed: true } },
    },
  });

  const dates = getDateRange(
    startDate,
    Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
  ).filter(d => d <= endDate);

  const choreDetails: Record<string, ChoreBreakdown> = {};
  let choreAmount = 0;

  for (const chore of chores) {
    let scheduledDays = 0;
    let completedDays = 0;

    for (const date of dates) {
      const isScheduled = chore.schedules.some(s => isChoreScheduledForDate({ ...s }, date));
      // logs は completed:true で取得済みなので、その日の完了 = ログが存在すること
      const completedOnDate = chore.logs.some(l => l.date === date);

      if (isScheduled) scheduledDays++;
      if (completedOnDate) {
        completedDays++;
        choreAmount += chore.amount;
        // 予定外の日に完了した分も「機会」として scheduled に含める(completed ≤ scheduled を保証)
        if (!isScheduled) scheduledDays++;
      }
    }

    if (scheduledDays > 0 || completedDays > 0) {
      choreDetails[chore.name] = {
        name: chore.name,
        amount: chore.amount,
        scheduled: scheduledDays,
        completed: completedDays,
      };
    }
  }

  const baseAmount = allowanceConfig?.amount ?? 0;
  const totalAmount = baseAmount + choreAmount;

  return { baseAmount, choreAmount, totalAmount, choreDetails };
}
