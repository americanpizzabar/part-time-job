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
        // 完了 = その日の完了ログ件数(通常+追加、予定変更後も「やった分」を数える)
        const completedHere = chore.logs.filter(l => l.date === date && l.completed).length;

        if (isScheduled) scheduled++;
        completed += completedHere;
        // 完了したが予定として数えていない分を機会に加える(completed ≤ scheduled を保証)
        const extraOpportunities = isScheduled
          ? Math.max(0, completedHere - 1)
          : completedHere;
        scheduled += extraOpportunities;
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
          const completedHere = chore.logs.filter(l => l.date === date && l.completed).length;
          if (isScheduled) ws++;
          wc += completedHere;
          we += completedHere * chore.amount;
          ws += isScheduled ? Math.max(0, completedHere - 1) : completedHere;
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
