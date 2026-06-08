import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const { choreId, scheduleType, daysOfWeek, specificDates, startDate, endDate } = body;

  if (!choreId || !scheduleType) {
    return NextResponse.json({ error: "choreId and scheduleType are required" }, { status: 400 });
  }

  const schedule = await prisma.choreSchedule.create({
    data: {
      choreId: Number(choreId),
      scheduleType,
      daysOfWeek: daysOfWeek ? JSON.stringify(daysOfWeek) : null,
      specificDates: specificDates ? JSON.stringify(specificDates) : null,
      startDate: startDate || null,
      endDate: endDate || null,
    },
  });
  return NextResponse.json(schedule, { status: 201 });
}
