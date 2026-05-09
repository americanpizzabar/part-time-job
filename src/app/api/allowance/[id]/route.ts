import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { isPaid, notes } = body;

  const period = await prisma.allowancePeriod.update({
    where: { id: Number(id) },
    data: {
      ...(isPaid !== undefined && { isPaid, paidAt: isPaid ? new Date() : null }),
      ...(notes !== undefined && { notes }),
    },
  });
  return NextResponse.json(period);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.allowancePeriod.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
