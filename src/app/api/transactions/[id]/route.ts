import { NextResponse } from "next/server";
import { prisma, basePrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
  const txId = Number(id);
  const tx = await prisma.transaction.findUnique({ where: { id: txId } });
  if (!tx) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (tx.source === "MERCARI") {
    // メルカリ売上: 紐づく MercariSale を削除し累計を調整してから取引を削除
    const sale = await basePrisma.mercariSale.findFirst({
      where: { transactionId: txId },
    });
    if (sale) {
      await basePrisma.mercariSale.delete({ where: { id: sale.id } });
      // OptisState.mercariTotal を減算(同一テナント内で findFirst)
      const state = await prisma.optisState.findFirst();
      if (state) {
        await prisma.optisState.update({
          where: { id: state.id },
          data: { mercariTotal: Math.max(0, state.mercariTotal - sale.amount) },
        });
      }
    }
    await prisma.transaction.delete({ where: { id: txId } });
    return NextResponse.json({ ok: true });
  }

  if (tx.source !== "MANUAL") {
    return NextResponse.json(
      { error: "この収支は元の画面（おねだり・お小遣い等）から操作してください" },
      { status: 400 }
    );
  }

  await prisma.transaction.delete({ where: { id: txId } });
  return NextResponse.json({ ok: true });
}
