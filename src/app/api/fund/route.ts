import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

async function getOrCreateFund() {
  const existing = await prisma.indexFund.findFirst({ orderBy: { id: "asc" } });
  if (existing) return existing;
  return prisma.indexFund.create({ data: {} });
}

async function applyMonthlyReturnIfNeeded(fund: Awaited<ReturnType<typeof getOrCreateFund>>) {
  if (fund.currentValue <= 0) return fund;
  if (!fund.lastReturnAt) return fund;

  const lastReturn = new Date(fund.lastReturnAt);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - lastReturn.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 30) return fund;

  // Apply monthly return: annualRate / 12
  const monthlyRate = fund.baseReturnRate / 100 / 12;
  const returnAmount = Math.round(fund.currentValue * monthlyRate);
  const todayStr = today();

  await prisma.indexFundTx.create({
    data: {
      fundId: fund.id,
      amount: returnAmount,
      type: "RETURN",
      date: todayStr,
      memo: `月次リターン (年利${fund.baseReturnRate}%)`,
    },
  });

  const updated = await prisma.indexFund.update({
    where: { id: fund.id },
    data: {
      currentValue: fund.currentValue + returnAmount,
      lastReturnAt: todayStr,
    },
  });

  // Parent match bonus
  if (fund.parentMatchRate > 0 && returnAmount > 0) {
    const bonusAmount = Math.round(returnAmount * fund.parentMatchRate / 100);
    if (bonusAmount > 0) {
      await prisma.indexFundTx.create({
        data: {
          fundId: fund.id,
          amount: bonusAmount,
          type: "PARENT_BONUS",
          date: todayStr,
          memo: `親マッチボーナス (${fund.parentMatchRate}%)`,
        },
      });
      return prisma.indexFund.update({
        where: { id: fund.id },
        data: { currentValue: updated.currentValue + bonusAmount },
      });
    }
  }

  return updated;
}

export async function GET() {
  let fund = await getOrCreateFund();
  fund = await applyMonthlyReturnIfNeeded(fund);

  const recentTxs = await prisma.indexFundTx.findMany({
    where: { fundId: fund.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const growthAmount = fund.currentValue - fund.invested;
  const growthPct = fund.invested > 0 ? Math.round((growthAmount / fund.invested) * 100) : 0;

  return NextResponse.json({
    ...fund,
    growthAmount,
    growthPct,
    recentTxs,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { amount } = body as { amount: number };

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount is required" }, { status: 400 });
  }

  const todayStr = today();
  const fund = await getOrCreateFund();

  // Create EXPENSE transaction (real yen from wallet)
  await prisma.transaction.create({
    data: {
      type: "EXPENSE",
      amount,
      category: "インデックスファンド",
      needsWants: "NEEDS",
      date: todayStr,
      memo: "ジュニア・ファンドへの投資",
      source: "MANUAL",
    },
  });

  // Add to fund
  await prisma.indexFundTx.create({
    data: {
      fundId: fund.id,
      amount,
      type: "INVEST",
      date: todayStr,
    },
  });

  const updated = await prisma.indexFund.update({
    where: { id: fund.id },
    data: {
      invested: fund.invested + amount,
      currentValue: fund.currentValue + amount,
      lastReturnAt: fund.lastReturnAt ?? todayStr,
    },
  });

  return NextResponse.json(updated, { status: 201 });
}
