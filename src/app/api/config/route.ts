import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const allowanceConfig = await prisma.allowanceConfig.findFirst({
    orderBy: { createdAt: "desc" },
  });
  // 全消費箇所(クイズ・スタミナ・集計)と同じ「最古の1行」を正とする
  const aggregationConfig = await prisma.aggregationConfig.findFirst({
    orderBy: { id: "asc" },
  });
  return NextResponse.json({
    allowance: allowanceConfig,
    aggregation: aggregationConfig ?? { periodDays: 7, startDayOfWeek: 1 },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { allowance, aggregation } = body;

  const results: Record<string, unknown> = {};

  if (allowance) {
    const { period, amount, startDate } = allowance;
    const config = await prisma.allowanceConfig.create({
      data: { period, amount: Number(amount), startDate },
    });
    results.allowance = config;
  }

  if (aggregation) {
    const { periodDays, startDayOfWeek, weeklyBudget, quizBonusPerCorrect, quizBonusDailyCap, quizBonusHardBoost, quizPenaltyAmount, staminaEnabled, simpleUi } = aggregation;
    // 重複行があると保存先と読出元がズレるため、最古の1行に統一し余剰行は削除する
    const all = await prisma.aggregationConfig.findMany({ orderBy: { id: "asc" } });
    const existing = all[0] ?? null;
    if (all.length > 1) {
      await prisma.aggregationConfig.deleteMany({
        where: { id: { in: all.slice(1).map(c => c.id) } },
      });
    }
    const config = existing
      ? await prisma.aggregationConfig.update({
          where: { id: existing.id },
          data: {
            ...(periodDays !== undefined && { periodDays: Number(periodDays) }),
            ...(startDayOfWeek !== undefined && { startDayOfWeek: Number(startDayOfWeek) }),
            ...(weeklyBudget !== undefined && {
              weeklyBudget: weeklyBudget === null || weeklyBudget === "" ? null : Number(weeklyBudget),
            }),
            ...(quizBonusPerCorrect !== undefined && { quizBonusPerCorrect: Number(quizBonusPerCorrect) || 0 }),
            ...(quizBonusDailyCap !== undefined && {
              quizBonusDailyCap: quizBonusDailyCap === null || quizBonusDailyCap === "" ? null : Number(quizBonusDailyCap),
            }),
            ...(quizBonusHardBoost !== undefined && { quizBonusHardBoost: Number(quizBonusHardBoost) || 0 }),
            ...(quizPenaltyAmount !== undefined && { quizPenaltyAmount: Number(quizPenaltyAmount) || 0 }),
            ...(staminaEnabled !== undefined && { staminaEnabled: !!staminaEnabled }),
            ...(simpleUi !== undefined && { simpleUi: !!simpleUi }),
          },
        })
      : await prisma.aggregationConfig.create({
          data: {
            periodDays: Number(periodDays ?? 7),
            startDayOfWeek: Number(startDayOfWeek ?? 1),
            weeklyBudget: weeklyBudget ? Number(weeklyBudget) : null,
            quizBonusPerCorrect: Number(quizBonusPerCorrect) || 0,
            quizBonusDailyCap: quizBonusDailyCap ? Number(quizBonusDailyCap) : null,
            quizBonusHardBoost: Number(quizBonusHardBoost) || 0,
            quizPenaltyAmount: Number(quizPenaltyAmount) || 0,
            staminaEnabled: !!staminaEnabled,
            simpleUi: !!simpleUi,
          },
        });
    results.aggregation = config;
  }

  return NextResponse.json(results);
}
