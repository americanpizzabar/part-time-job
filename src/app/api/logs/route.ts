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
    where: { isActive: true },
    include: {
      schedules: { where: { isActive: true } },
      logs: { where: { date: { gte: startDate, lte: endDate } } },
    },
    orderBy: { name: "asc" },
  });

  // デイリー報酬クイズのボーナス: その日のお手伝いに上乗せして表示・集計する
  const quizBonuses = await prisma.quizBonusEarning.findMany({
    where: { earnedDate: { gte: startDate, lte: endDate } },
  });
  const bonusByDate = new Map<string, number>();
  for (const b of quizBonuses) {
    bonusByDate.set(b.earnedDate, (bonusByDate.get(b.earnedDate) ?? 0) + b.amount);
  }

  const dates = getDateRange(startDate,
    Math.min(
      Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1,
      366
    )
  ).filter(d => d <= endDate);

  const result = dates.map(date => {
    const dayChores = chores
      .filter(chore => {
        const isScheduled = chore.schedules.some(s => isChoreScheduledForDate({ ...s, isActive: s.isActive }, date));
        // 予定 / 追加ログ / 予定変更後に残った完了ログ のいずれかがあれば表示
        // (完了済みのお手伝いが画面から消えてお小遣いとズレるのを防ぐ)
        const hasLog = chore.logs.some(l => l.date === date);
        return isScheduled || hasLog;
      })
      .map(chore => {
        const log = chore.logs.find(l => l.date === date && !l.isExtra);
        const extraLog = chore.logs.find(l => l.date === date && l.isExtra);
        const isScheduled = chore.schedules.some(s => isChoreScheduledForDate({ ...s, isActive: s.isActive }, date));
        const amountOverride = log?.amountOverride ?? extraLog?.amountOverride ?? null;
        return {
          id: chore.id,
          name: chore.name,
          amount: chore.amount,
          amountOverride: amountOverride !== undefined ? amountOverride : null,
          description: chore.description,
          isScheduled,
          logId: log?.id ?? extraLog?.id ?? null,
          completed: log?.completed ?? extraLog?.completed ?? false,
          isExtra: !isScheduled,
          completedAt: log?.completedAt ?? extraLog?.completedAt ?? null,
        };
      });

    const choreSum = dayChores
      .filter(c => c.completed)
      .reduce((sum, c) => sum + (c.amountOverride ?? c.amount), 0);
    const quizBonus = bonusByDate.get(date) ?? 0;

    return { date, chores: dayChores, totalAmount: choreSum + quizBonus, quizBonus };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { choreId, date, isExtra } = body;

  if (!choreId || !date) {
    return NextResponse.json({ error: "choreId and date are required" }, { status: 400 });
  }

  try {
    const log = await prisma.choreLog.create({
      data: {
        choreId: Number(choreId),
        date,
        completed: false,
        isExtra: isExtra ?? false,
      },
    });
    return NextResponse.json(log, { status: 201 });
  } catch {
    const existing = await prisma.choreLog.findFirst({
      where: { choreId: Number(choreId), date, isExtra: isExtra ?? false },
    });
    return NextResponse.json(existing, { status: 200 });
  }
}
