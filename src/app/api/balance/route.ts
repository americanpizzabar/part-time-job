import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const monthStart = searchParams.get("monthStart"); // "YYYY-MM-01"
  const monthEnd = searchParams.get("monthEnd"); // "YYYY-MM-DD"

  const [transactions, savings] = await Promise.all([
    prisma.transaction.findMany(),
    prisma.savingsTransaction.findMany(),
  ]);

  const income = transactions
    .filter(t => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);
  const wallet = income - expense;
  const saved = savings.reduce((s, t) => s + t.amount, 0);
  const free = wallet - saved;

  // 当月のNeeds/Wants集計
  let monthNeeds = 0;
  let monthWants = 0;
  let monthIncome = 0;
  let monthExpense = 0;
  if (monthStart && monthEnd) {
    for (const t of transactions) {
      if (t.date < monthStart || t.date > monthEnd) continue;
      if (t.type === "INCOME") monthIncome += t.amount;
      if (t.type === "EXPENSE") {
        monthExpense += t.amount;
        if (t.needsWants === "NEEDS") monthNeeds += t.amount;
        else if (t.needsWants === "WANTS") monthWants += t.amount;
      }
    }
  }

  const monthTotal = monthNeeds + monthWants;
  const needsRatio = monthTotal > 0 ? Math.round((monthNeeds / monthTotal) * 100) : 0;
  const wantsRatio = monthTotal > 0 ? 100 - needsRatio : 0;

  return NextResponse.json({
    wallet,
    saved,
    free,
    income,
    expense,
    month: {
      needs: monthNeeds,
      wants: monthWants,
      total: monthTotal,
      income: monthIncome,
      expense: monthExpense,
      needsRatio,
      wantsRatio,
    },
  });
}
