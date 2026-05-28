import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const goals = await prisma.savingsGoal.findMany({
    include: { contributions: { orderBy: { date: "desc" } } },
    orderBy: [{ isAchieved: "asc" }, { createdAt: "desc" }],
  });

  const result = goals.map(goal => {
    const saved = goal.contributions.reduce((s, c) => s + c.amount, 0);
    const progress =
      goal.targetAmount > 0 ? Math.min(100, Math.round((saved / goal.targetAmount) * 100)) : 0;
    return { ...goal, saved, progress, remaining: Math.max(0, goal.targetAmount - saved) };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, targetAmount, deadline, imageUrl } = body;

  if (!name || targetAmount === undefined) {
    return NextResponse.json({ error: "name and targetAmount are required" }, { status: 400 });
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      name,
      targetAmount: Number(targetAmount),
      deadline: deadline || null,
      imageUrl: imageUrl || null,
    },
  });
  return NextResponse.json(goal, { status: 201 });
}
