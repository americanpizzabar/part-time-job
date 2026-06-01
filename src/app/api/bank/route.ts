import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";
import { getOptisState } from "@/lib/optisServer";
import { addDays } from "date-fns";
import { toDateStr } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getOptisState();
  const deposits = await prisma.virtualBankDeposit.findMany({ orderBy: { createdAt: "desc" } });
  const now = today();

  // 満期チェック: ACTIVE で maturityDate <= today
  const matured = deposits.filter(d => d.status === "ACTIVE" && d.maturityDate <= now);
  for (const d of matured) {
    const interest = Math.round(d.principal * (d.ratePercent / 100));
    await prisma.virtualBankDeposit.update({
      where: { id: d.id },
      data: { status: "MATURED", interestEarned: interest, settledAt: new Date() },
    });
    await prisma.optisState.update({
      where: { id: state.id },
      data: { gcoins: state.gcoins + d.principal + interest },
    });
  }

  const fresh = await prisma.optisState.findFirst({ orderBy: { id: "asc" } });
  const freshDeposits = await prisma.virtualBankDeposit.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ gcoins: fresh?.gcoins ?? 0, deposits: freshDeposits });
}

export async function POST(req: Request) {
  const { amount } = await req.json();
  const coins = Number(amount);
  if (!coins || coins < 5) return NextResponse.json({ error: "5Gコイン以上を預けてください" }, { status: 400 });

  const state = await getOptisState();
  if (state.gcoins < coins) return NextResponse.json({ error: "Gコインが足りません" }, { status: 400 });

  const maturityDate = toDateStr(addDays(new Date(), 7));
  const deposit = await prisma.virtualBankDeposit.create({
    data: { principal: coins, depositDate: today(), maturityDate, ratePercent: 10 },
  });
  await prisma.optisState.update({ where: { id: state.id }, data: { gcoins: state.gcoins - coins } });
  return NextResponse.json(deposit, { status: 201 });
}
