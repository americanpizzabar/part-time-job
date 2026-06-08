import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { scheduleType, daysOfWeek, specificDates, startDate, endDate, isActive } = body;

  const schedule = await prisma.choreSchedule.update({
    where: { id: Number(id) },
    data: {
      ...(scheduleType !== undefined && { scheduleType }),
      ...(daysOfWeek !== undefined && { daysOfWeek: JSON.stringify(daysOfWeek) }),
      ...(specificDates !== undefined && { specificDates: JSON.stringify(specificDates) }),
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  return NextResponse.json(schedule);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.choreSchedule.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
