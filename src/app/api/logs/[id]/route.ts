import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { completed } = body;

  const log = await prisma.choreLog.update({
    where: { id: Number(id) },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });
  return NextResponse.json(log);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.choreLog.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
