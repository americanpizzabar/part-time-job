import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { completed, amountOverride } = body;

  const data: Record<string, unknown> = {};
  if (completed !== undefined) {
    data.completed = completed;
    data.completedAt = completed ? new Date() : null;
  }
  if (amountOverride !== undefined) {
    // null = リセット(Chore.amount に戻す), 数値 = 個別上書き
    data.amountOverride = amountOverride === null ? null : Number(amountOverride);
  }

  const log = await prisma.choreLog.update({
    where: { id: Number(id) },
    data,
  });
  return NextResponse.json(log);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.choreLog.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
