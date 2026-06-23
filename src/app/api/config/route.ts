import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const allowanceConfig = await prisma.allowanceConfig.findFirst({
    orderBy: { createdAt: "desc" },
  });
  const aggregationConfig = await prisma.aggregationConfig.findFirst({
    orderBy: { createdAt: "desc" },
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
    const { periodDays, startDayOfWeek, weeklyBudget, quizBonusPerCorrect, quizBonusDailyCap, quizBonusHardBoost } = aggregation;
    const existing = await prisma.aggregationConfig.findFirst();
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
          },
        });
    results.aggregation = config;
  }

  return NextResponse.json(results);
}
