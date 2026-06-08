import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, amount, description, isActive } = body;

  const chore = await prisma.chore.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { schedules: true },
  });
  return NextResponse.json(chore);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.chore.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
