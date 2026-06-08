import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAllowance } from "@/lib/allowanceCalc";

export const dynamic = "force-dynamic";

export async function GET() {
  const periods = await prisma.allowancePeriod.findMany({
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json(periods);
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
