import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";
import { EXP_PER_RECORD, EXP_NEEDS_BONUS } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const category = searchParams.get("category");

  const where = {
    ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {}),
    ...(category ? { category } : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { type, amount, category, needsWants, date, memo, isPrivate, imageUrl, reportedAt } = body;

  if (!type || amount === undefined || !date) {
    return NextResponse.json({ error: "type, amount, date are required" }, { status: 400 });
  }
  if (type === "EXPENSE" && !needsWants) {
    return NextResponse.json({ error: "needsWants is required for expense" }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      type,
      amount: Number(amount),
      category: type === "EXPENSE" ? category ?? null : null,
      needsWants: type === "EXPENSE" ? needsWants ?? null : null,
      date,
      reportedAt: reportedAt ? new Date(reportedAt) : new Date(),
      memo: memo ?? null,
      imageUrl: type === "EXPENSE" ? imageUrl ?? null : null,
      isPrivate: Boolean(isPrivate),
      source: "MANUAL",
    },
  });

  // Optisに経験値を付与(凍結中を除く)。0円申告(amount=0)でも記録経験は付与
  let expGain = 0;
  if (type === "EXPENSE") {
    const state = await getOptisState();
    const frozen = state.freezeUntil && state.freezeUntil > new Date();
    if (!frozen) {
      expGain = EXP_PER_RECORD + (needsWants === "NEEDS" ? EXP_NEEDS_BONUS : 0);
      await prisma.optisState.update({
        where: { id: state.id },
        data: { experience: state.experience + expGain },
      });
    }
  }

  return NextResponse.json({ ...transaction, expGain }, { status: 201 });
}
