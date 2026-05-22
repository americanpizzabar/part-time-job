import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isChoreScheduledForDate, getDateRange } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
  }

  const chores = await prisma.chore.findMany({
    include: {
      schedules: { where: { isActive: true } },
      logs: { where: { date: { gte: startDate, lte: endDate } } },
    },
    orderBy: { name: "asc" },
  });

  const dayCount =
    Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
  const dates = getDateRange(startDate, dayCount).filter(d => d <= endDate);

  const choreStats = chores
    .map(chore => {
      let scheduled = 0;
      let completed = 0;

      for (const date of dates) {
        const isScheduled = chore.schedules.some(s => isChoreScheduledForDate(s, date));
        const extraLogs = chore.logs.filter(l => l.date === date && l.isExtra);
        const regularLog = chore.logs.find(l => l.date === date && !l.isExtra);

        if (isScheduled) {
          scheduled++;
          if (regularLog?.completed) completed++;
        }
        // 追加お手伝いは完了したものだけカウント
        for (const extra of extraLogs) {
          if (extra.completed) {
            scheduled++;
            completed++;
          }
        }
      }

      return {
        choreId: chore.id,
        choreName: chore.name,
        amount: chore.amount,
        scheduled,
        completed,
        earned: completed * chore.amount,
        rate: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0,
      };
    })
    .filter(s => s.scheduled > 0 || s.completed > 0);

  const totalScheduled = choreStats.reduce((s, c) => s + c.scheduled, 0);
  const totalCompleted = choreStats.reduce((s, c) => s + c.completed, 0);
  const totalEarned = choreStats.reduce((s, c) => s + c.earned, 0);
  const overallRate =
    totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  // 週ごとの推移（7日以上の場合のみ）
  const weeklyTrend: { label: string; rate: number; earned: number }[] = [];
  if (dayCount >= 7) {
    const weekSize = 7;
    for (let i = 0; i < dates.length; i += weekSize) {
      const weekDates = dates.slice(i, i + weekSize);
      const weekStart = weekDates[0];
      const weekEnd = weekDates[weekDates.length - 1];
      let ws = 0;
      let wc = 0;
      let we = 0;
      for (const chore of chores) {
        for (const date of weekDates) {
          const isScheduled = chore.schedules.some(s => isChoreScheduledForDate(s, date));
          const regularLog = chore.logs.find(l => l.date === date && !l.isExtra);
          const extraLogs = chore.logs.filter(l => l.date === date && l.isExtra && l.completed);
          if (isScheduled) {
            ws++;
            if (regularLog?.completed) { wc++; we += chore.amount; }
          }
          for (const _ of extraLogs) { ws++; wc++; we += chore.amount; }
        }
      }
      weeklyTrend.push({
        label: weekStart.slice(5) + "〜" + weekEnd.slice(5),
        rate: ws > 0 ? Math.round((wc / ws) * 100) : 0,
        earned: we,
      });
    }
  }

  return NextResponse.json({
    choreStats,
    totalScheduled,
    totalCompleted,
    totalEarned,
    overallRate,
    weeklyTrend,
    dates: { startDate, endDate, dayCount },
  });
}
