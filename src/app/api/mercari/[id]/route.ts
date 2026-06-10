import { NextResponse } from "next/server";
import { prisma, basePrisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";

export const dynamic = "force-dynamic";

// 売上の編集: 金額/商品名を更新し、メルカリ累計と紐づく収入トランザクションを同期
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saleId = Number(id);
  const body = (await req.json()) as { amount?: number; itemName?: string };

  const sale = await prisma.mercariSale.findUnique({ where: { id: saleId } });
  if (!sale) {
    return NextResponse.json({ error: "sale not found" }, { status: 404 });
  }

  const newAmount = body.amount !== undefined ? Number(body.amount) : sale.amount;
  if (!Number.isFinite(newAmount) || newAmount <= 0) {
    return NextResponse.json({ error: "amount must be greater than 0" }, { status: 400 });
  }
  const newItemName =
    body.itemName !== undefined ? (body.itemName.trim() || null) : sale.itemName;

  const delta = newAmount - sale.amount;

  await prisma.mercariSale.update({
    where: { id: saleId },
    data: { amount: newAmount, itemName: newItemName },
  });

  // 紐づく収入トランザクションも更新
  if (sale.transactionId) {
    await prisma.transaction.update({
      where: { id: sale.transactionId },
      data: {
        amount: newAmount,
        memo: "メルカリ売上" + (newItemName ? `: ${newItemName}` : ""),
      },
    }).catch(() => {});
  }

  // メルカリ累計を差分で調整(マイナスにはしない)。一度解放したトレーダー属性は剥奪しない
  if (delta !== 0) {
    const state = await getOptisState();
    await prisma.optisState.update({
      where: { id: state.id },
      data: { mercariTotal: Math.max(0, state.mercariTotal + delta) },
    });
  }

  return NextResponse.json({ ok: true });
}

// 売上の削除: メルカリ累計を減算し、紐づく収入トランザクションも削除
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saleId = Number(id);

  const sale = await prisma.mercariSale.findUnique({ where: { id: saleId } });
  if (!sale) {
    return NextResponse.json({ error: "sale not found" }, { status: 404 });
  }

  // basePrisma でテナントガードの childProfileId 制約を回避して確実に削除。
  // familyId は sale から取得して同一家族のトランザクションのみ削除する。
  if (sale.transactionId) {
    await basePrisma.transaction.delete({
      where: { id: sale.transactionId },
    }).catch(() => {});
  } else {
    // transactionId が未記録の古いデータ向けフォールバック:
    // 同日・同額・source=MERCARI のトランザクションを探して削除
    const linked = await basePrisma.transaction.findFirst({
      where: { familyId: sale.familyId, source: "MERCARI", amount: sale.amount, date: sale.date },
    });
    if (linked) {
      await basePrisma.transaction.delete({ where: { id: linked.id } }).catch(() => {});
    }
  }

  await prisma.mercariSale.delete({ where: { id: saleId } });

  const state = await getOptisState();
  await prisma.optisState.update({
    where: { id: state.id },
    data: { mercariTotal: Math.max(0, state.mercariTotal - sale.amount) },
  });

  return NextResponse.json({ ok: true });
}
