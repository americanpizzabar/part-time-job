import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goalId = Number(id);
  const body = await req.json();
  const { amount, memo } = body;
  const amt = Number(amount);

  if (!amt || isNaN(amt)) {
    return NextResponse.json({ error: "amount is required" }, { status: 400 });
  }

  const goal = await prisma.savingsGoal.findUnique({
    where: { id: goalId },
    include: { contributions: true },
  });
  if (!goal) {
    return NextResponse.json({ error: "goal not found" }, { status: 404 });
  }

  const goalSaved = goal.contributions.reduce((s, c) => s + c.amount, 0);

  // 引き出し時はその目標の貯金額を超えられない
  if (amt < 0 && goalSaved + amt < 0) {
    return NextResponse.json({ error: "貯金額より多くは引き出せません" }, { status: 400 });
  }

  // 積立時は自由に使えるお金を超えられない
  if (amt > 0) {
    const [transactions, allSavings] = await Promise.all([
      prisma.transaction.findMany(),
      prisma.savingsTransaction.findMany(),
    ]);
    const wallet =
      transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0) -
      transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
    const totalSaved = allSavings.reduce((s, t) => s + t.amount, 0);
    const free = wallet - totalSaved;
    if (amt > free) {
      return NextResponse.json(
        { error: `自由に使えるお金（¥${free.toLocaleString()}）を超えて貯金はできません` },
        { status: 400 }
      );
    }
  }

  await prisma.savingsTransaction.create({
    data: { goalId, amount: amt, date: today(), memo: memo ?? null },
  });

  const newSaved = goalSaved + amt;
  if (newSaved >= goal.targetAmount && !goal.isAchieved) {
    await prisma.savingsGoal.update({
      where: { id: goalId },
      data: { isAchieved: true, achievedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true, saved: newSaved });
}
