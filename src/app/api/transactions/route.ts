import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";
import { EXP_PER_RECORD, EXP_NEEDS_BONUS, AWAKENING_PER_NEEDS, awakeningTier, EN_MODE_EXP_MULTIPLIER } from "@/lib/optis";
import { generateCareerFeedback } from "@/lib/careerFeedback";

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
  const { type, amount, category, needsWants, assetCategory, date, memo, isPrivate, imageUrl, reportedAt } = body;

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
      assetCategory: (type === "EXPENSE" && needsWants === "NEEDS") ? assetCategory ?? null : null,
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
  let feedBoostApplied = false;
  if (type === "EXPENSE") {
    const state = await getOptisState();
    const frozen = state.freezeUntil && state.freezeUntil > new Date();
    if (!frozen) {
      const isNeeds = needsWants === "NEEDS";
      let baseExp = EXP_PER_RECORD + (isNeeds ? EXP_NEEDS_BONUS : 0);

      // シャドウ・フィードのブースト効果を確認(Needs記録のみ対象)
      if (isNeeds && category) {
        const now = new Date();
        const boostItems = await prisma.feedItem.findMany({
          where: {
            isActive: true,
            category: "BOOST",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        });
        for (const item of boostItems) {
          if (!item.effectJson) continue;
          try {
            const effect = JSON.parse(item.effectJson) as { type: string; category: string; multiplier: number };
            if (effect.type === "exp_multiplier" && category === effect.category) {
              baseExp = Math.round(baseExp * effect.multiplier);
              feedBoostApplied = true;
              break;
            }
          } catch { /* skip malformed */ }
        }
      }

      // 英語モード: EXP × 1.5
      if (state.langMode === "EN") {
        baseExp = Math.round(baseExp * EN_MODE_EXP_MULTIPLIER);
      }

      expGain = baseExp;
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

  let careerFeedback: string | null = null;
  if (type === "EXPENSE" && needsWants === "NEEDS" && assetCategory) {
    // Fetch last 90 days career totals for feedback generation
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString().slice(0, 10);
    const needsTxs = await prisma.transaction.findMany({
      where: { type: "EXPENSE", needsWants: "NEEDS", date: { gte: sinceStr }, assetCategory: { not: null } },
      select: { assetCategory: true, amount: true },
    });
    const stemTotal = needsTxs.filter(t => t.assetCategory === "STEM").reduce((s, t) => s + t.amount, 0);
    const artTotal = needsTxs.filter(t => t.assetCategory === "ART_CULTURE").reduce((s, t) => s + t.amount, 0);
    const healthTotal = needsTxs.filter(t => t.assetCategory === "HEALTH_SOCIAL").reduce((s, t) => s + t.amount, 0);
    const totalNeeds = needsTxs.reduce((s, t) => s + t.amount, 0);
    careerFeedback = generateCareerFeedback({ stemTotal, artTotal, healthTotal, totalNeeds, assetCategory });
  }

  return NextResponse.json(
    { ...transaction, expGain, awakened, awakeningTier: awakeningTierAfter, feedBoostApplied, careerFeedback },
    { status: 201 }
  );
}
