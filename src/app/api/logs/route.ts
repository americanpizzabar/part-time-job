import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isChoreScheduledForDate, getDateRange } from "@/lib/dateUtils";

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
        const hasExtraLog = chore.logs.some(l => l.date === date && l.isExtra);
        return isScheduled || hasExtraLog;
      })
      .map(chore => {
        const log = chore.logs.find(l => l.date === date && !l.isExtra);
        const extraLog = chore.logs.find(l => l.date === date && l.isExtra);
        const isScheduled = chore.schedules.some(s => isChoreScheduledForDate({ ...s, isActive: s.isActive }, date));
        return {
          id: chore.id,
          name: chore.name,
          amount: chore.amount,
          description: chore.description,
          isScheduled,
          logId: log?.id ?? extraLog?.id ?? null,
          completed: log?.completed ?? extraLog?.completed ?? false,
          isExtra: !isScheduled,
          completedAt: log?.completedAt ?? extraLog?.completedAt ?? null,
        };
      });

    const totalAmount = dayChores
      .filter(c => c.completed)
      .reduce((sum, c) => sum + c.amount, 0);

    return { date, chores: dayChores, totalAmount };
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
