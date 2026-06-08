import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAllowance } from "@/lib/allowanceCalc";

export const dynamic = "force-dynamic";

export async function GET() {
  const periods = await prisma.allowancePeriod.findMany({
    orderBy: { startDate: "desc" },
  });

  // 未払い期間は現在の完了ログで自動的に最新化する(支払済みは記録として固定)。
  // これにより集計後にお手伝いを完了しても画面の数字がズレない。
  const refreshed = await Promise.all(
    periods.map(async (p) => {
      if (p.isPaid) return p;
      const { baseAmount, choreAmount, totalAmount, choreDetails } = await calculateAllowance(
        p.startDate,
        p.endDate
      );
      const snapshot = JSON.stringify(choreDetails);
      if (
        p.baseAmount === baseAmount &&
        p.choreAmount === choreAmount &&
        p.totalAmount === totalAmount &&
        p.snapshot === snapshot
      ) {
        return p;
      }
      return prisma.allowancePeriod.update({
        where: { id: p.id },
        data: { baseAmount, choreAmount, totalAmount, snapshot },
      });
    })
  );

  return NextResponse.json(refreshed);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { startDate, endDate, notes } = body;

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
  }

  const { baseAmount, choreAmount, totalAmount, choreDetails } = await calculateAllowance(
    startDate,
    endDate
  );

  const period = await prisma.allowancePeriod.create({
    data: {
      startDate,
      endDate,
      baseAmount,
      choreAmount,
      totalAmount,
      notes,
      snapshot: JSON.stringify(choreDetails),
    },
  });

  return NextResponse.json(period, { status: 201 });
}
