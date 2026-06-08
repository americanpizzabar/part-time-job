import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";
import { TRADER_PART_IDS } from "@/lib/optis";
import { today } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getOptisState();
  const sales = await prisma.mercariSale.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    total: state.mercariTotal,
    traderUnlocked: state.traderUnlocked,
    sales,
    traderParts: TRADER_PART_IDS,
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { amount: number; itemName?: string };
  const amount = Number(body.amount);
  const itemName = body.itemName?.trim() || undefined;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be greater than 0" }, { status: 400 });
  }

  const state = await getOptisState();
  const todayStr = today();

  // 1. Record income transaction
  const tx = await prisma.transaction.create({
    data: {
      type: "INCOME",
      amount,
      date: todayStr,
      memo: "メルカリ売上" + (itemName ? `: ${itemName}` : ""),
      source: "MERCARI",
    },
  });

  // 2. Record the sale (linked to the income transaction)
  await prisma.mercariSale.create({
    data: { itemName: itemName ?? null, amount, date: todayStr, transactionId: tx.id },
  });

  // 3. EXP award (capped 200 per sale)
  const expGain = Math.min(200, Math.round(amount / 10));
  const newTotal = state.mercariTotal + amount;

  // 4. Trader unlock
  let traderUnlocked = state.traderUnlocked;
  let justUnlockedTrader = false;
  let newParts: string[] = [];
  let unlockedPartsJson = state.unlockedParts;

  if (newTotal >= 1000 && !state.traderUnlocked) {
    traderUnlocked = true;
    justUnlockedTrader = true;
    newParts = TRADER_PART_IDS;
    const existing = parseUnlocked(state.unlockedParts);
    const merged = [...new Set([...existing, ...TRADER_PART_IDS])];
    unlockedPartsJson = JSON.stringify(merged);
  }

  await prisma.optisState.update({
    where: { id: state.id },
    data: {
      mercariTotal: newTotal,
      experience: state.experience + expGain,
      ...(justUnlockedTrader ? { traderUnlocked: true, unlockedParts: unlockedPartsJson } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    total: newTotal,
    traderUnlocked,
    justUnlockedTrader,
    expGain,
    newParts,
  });
}
