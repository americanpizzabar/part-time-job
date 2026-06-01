import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  // Last 90 days
  const todayStr = today();
  const date90 = new Date();
  date90.setDate(date90.getDate() - 90);
  const startDate = date90.toISOString().slice(0, 10);

  const txs = await prisma.transaction.findMany({
    where: {
      type: "EXPENSE",
      needsWants: "NEEDS",
      date: { gte: startDate, lte: todayStr },
    },
  });

  const totals: Record<string, number> = {
    STEM: 0,
    ART_CULTURE: 0,
    HEALTH_SOCIAL: 0,
  };

  for (const tx of txs) {
    if (tx.assetCategory && tx.assetCategory in totals) {
      totals[tx.assetCategory] += tx.amount;
    }
  }

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  const categories = Object.entries(totals).map(([name, total]) => ({
    name,
    total,
    pct: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
  }));

  const topCategory = categories.reduce((a, b) => (b.total > a.total ? b : a), categories[0]);

  return NextResponse.json({
    categories,
    total: grandTotal,
    topCategory: grandTotal > 0 ? topCategory.name : null,
  });
}
