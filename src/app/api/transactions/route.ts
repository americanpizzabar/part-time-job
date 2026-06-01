import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";
import { EXP_PER_RECORD, EXP_NEEDS_BONUS, AWAKENING_PER_NEEDS, awakeningTier } from "@/lib/optis";

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
  // Needs(自己投資)購入は「良質なエネルギー」として覚醒値も上昇させ、装備を強化する。
  let expGain = 0;
  let awakened = false;
  let awakeningTierAfter = 0;
  if (type === "EXPENSE") {
    const state = await getOptisState();
    const frozen = state.freezeUntil && state.freezeUntil > new Date();
    if (!frozen) {
      const isNeeds = needsWants === "NEEDS";
      expGain = EXP_PER_RECORD + (isNeeds ? EXP_NEEDS_BONUS : 0);
      const prevTier = awakeningTier(state.awakening);
      const newAwakening = state.awakening + (isNeeds ? AWAKENING_PER_NEEDS : 0);
      awakeningTierAfter = awakeningTier(newAwakening);
      awakened = isNeeds && awakeningTierAfter > prevTier;
      await prisma.optisState.update({
        where: { id: state.id },
        data: { experience: state.experience + expGain, awakening: newAwakening },
      });
    }
  }

  return NextResponse.json(
    { ...transaction, expGain, awakened, awakeningTier: awakeningTierAfter },
    { status: 201 }
  );
}
