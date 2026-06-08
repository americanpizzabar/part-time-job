import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isChoreScheduledForDate, getDateRange } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  const periods = await prisma.allowancePeriod.findMany({
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json(periods);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { startDate, endDate, notes } = body;

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
  }

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

  const choreDetails: Record<string, { name: string; amount: number; completed: number; scheduled: number }> = {};
  let choreAmount = 0;

  for (const chore of chores) {
    let scheduledDays = 0;
    let completedDays = 0;

    for (const date of dates) {
      const isScheduled = chore.schedules.some(s => isChoreScheduledForDate({ ...s }, date));
      const hasExtraLog = chore.logs.some(l => l.date === date && l.isExtra);
      if (isScheduled || hasExtraLog) {
        scheduledDays++;
        const completedLog = chore.logs.find(l => l.date === date && l.completed);
        if (completedLog) {
          completedDays++;
          choreAmount += chore.amount;
        }
      }
    }

    if (scheduledDays > 0 || chore.logs.length > 0) {
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

  const period = await prisma.allowancePeriod.create({
    data: {
      startDate,
      endDate,
      baseAmount,
      choreAmount,
      totalAmount,
      notes,
      snapshot: JSON.stringify(choreDetails),
    },
  });

  return NextResponse.json(period, { status: 201 });
}
