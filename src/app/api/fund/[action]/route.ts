import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

async function getFund() {
  const fund = await prisma.indexFund.findFirst({ orderBy: { id: "asc" } });
  if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  return fund;
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const body = await req.json();
  const todayStr = today();

  if (action === "withdraw") {
    const { amount } = body as { amount: number };
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "amount is required" }, { status: 400 });
    }

    const fund = await prisma.indexFund.findFirst({ orderBy: { id: "asc" } });
    if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    if (fund.currentValue < amount) {
      return NextResponse.json({ error: "引き出し額がファンド評価額を超えています" }, { status: 400 });
    }

    // Create INCOME transaction (add to wallet)
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        amount,
        date: todayStr,
        memo: "ジュニア・ファンドからの引き出し",
        source: "MANUAL",
      },
    });

    await prisma.indexFundTx.create({
      data: {
        fundId: fund.id,
        amount,
        type: "WITHDRAW",
        date: todayStr,
      },
    });

    const invested = Math.max(0, fund.invested - amount);
    const updated = await prisma.indexFund.update({
      where: { id: fund.id },
      data: {
        invested,
        currentValue: fund.currentValue - amount,
      },
    });

    return NextResponse.json(updated);
  }

  if (action === "bonus") {
    const { amount } = body as { amount: number };
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "amount is required" }, { status: 400 });
    }

    const fund = await prisma.indexFund.findFirst({ orderBy: { id: "asc" } });
    if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 });

    await prisma.indexFundTx.create({
      data: {
        fundId: fund.id,
        amount,
        type: "PARENT_BONUS",
        date: todayStr,
        memo: "親ボーナス(手動)",
      },
    });

    const updated = await prisma.indexFund.update({
      where: { id: fund.id },
      data: {
        currentValue: fund.currentValue + amount,
        // Anchor lastReturnAt so applyMonthlyReturnIfNeeded can start counting from now
        lastReturnAt: fund.lastReturnAt ?? todayStr,
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;

  if (action === "settings") {
    const body = await req.json();
    const { parentMatchRate, baseReturnRate } = body as { parentMatchRate?: number; baseReturnRate?: number };

    const fund = await prisma.indexFund.findFirst({ orderBy: { id: "asc" } });
    if (!fund) {
      // Create fund if it doesn't exist yet
      const newFund = await prisma.indexFund.create({
        data: {
          parentMatchRate: parentMatchRate ?? 0,
          baseReturnRate: baseReturnRate ?? 5,
        },
      });
      return NextResponse.json(newFund);
    }

    const updated = await prisma.indexFund.update({
      where: { id: fund.id },
      data: {
        ...(parentMatchRate !== undefined ? { parentMatchRate } : {}),
        ...(baseReturnRate !== undefined ? { baseReturnRate } : {}),
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
