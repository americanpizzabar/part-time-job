import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";

export const dynamic = "force-dynamic";

// 早期引き出し: 利息全没収、元本のみ返還
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deposit = await prisma.virtualBankDeposit.findUnique({ where: { id: Number(id) } });
  if (!deposit) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (deposit.status !== "ACTIVE") return NextResponse.json({ error: "すでに精算済みです" }, { status: 400 });

  await prisma.virtualBankDeposit.update({
    where: { id: Number(id) },
    data: { status: "WITHDRAWN", settledAt: new Date() },
  });
  const state = await getOptisState();
  await prisma.optisState.update({
    where: { id: state.id },
    data: { gcoins: state.gcoins + deposit.principal }, // 利息なし
  });
  return NextResponse.json({ ok: true, returned: deposit.principal, interestLost: Math.round(deposit.principal * 0.1) });
}
