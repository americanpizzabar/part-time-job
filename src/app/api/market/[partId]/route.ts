import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PARTS, MARKET_BASE_PRICES } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ partId: string }> }) {
  const { partId } = await params;
  const part = PARTS.find(p => p.id === partId);
  if (!part) return NextResponse.json({ error: "not found" }, { status: 404 });

  const priceRow = await prisma.partMarketPrice.findFirst({ where: { partId } });
  const base = MARKET_BASE_PRICES[part.rarity];
  const history = (priceRow?.history as { date: string; price: number }[] | null) ?? [];

  return NextResponse.json({
    partId,
    part,
    basePrice: base,
    currentPrice: priceRow?.currentPrice ?? base,
    totalBought: priceRow?.totalBought ?? 0,
    totalSold: priceRow?.totalSold ?? 0,
    history: history.slice(-30),
  });
}
