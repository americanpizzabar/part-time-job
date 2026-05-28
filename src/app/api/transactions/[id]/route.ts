import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { type, amount, category, needsWants, date, memo, isPrivate } = body;

  const transaction = await prisma.transaction.update({
    where: { id: Number(id) },
    data: {
      ...(type !== undefined && { type }),
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(category !== undefined && { category }),
      ...(needsWants !== undefined && { needsWants }),
      ...(date !== undefined && { date }),
      ...(memo !== undefined && { memo }),
      ...(isPrivate !== undefined && { isPrivate: Boolean(isPrivate) }),
    },
  });
  return NextResponse.json(transaction);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tx = await prisma.transaction.findUnique({ where: { id: Number(id) } });
  if (tx?.source !== "MANUAL") {
    return NextResponse.json(
      { error: "自動計上された収支は直接削除できません（元の集計/おねだりから操作してください）" },
      { status: 400 }
    );
  }
  await prisma.transaction.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
