import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";
import { PARTS, MARKET_BASE_PRICES, computeMarketPrice, marketSellPrice, WEATHER_META, WeatherType } from "@/lib/optis";
import { today } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

async function getOrInitPrice(partId: string) {
  const existing = await prisma.partMarketPrice.findUnique({ where: { partId } });
  if (existing) return existing;
  const part = PARTS.find(p => p.id === partId);
  if (!part) return null;
  return prisma.partMarketPrice.create({
    data: { partId, currentPrice: MARKET_BASE_PRICES[part.rarity] },
  });
}

// GET: 全マーケットパーツとその価格
export async function GET() {
  const state = await getOptisState();
  const unlocked = parseUnlocked(state.unlockedParts);

  // Check weather and shield
  const activeWeather = await prisma.economicWeather.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  const shieldAttempt = await prisma.quizAttempt.findFirst({
    where: { correct: true, shieldUntil: { gt: new Date() } },
    orderBy: { shieldUntil: "desc" },
  });
  const hasShield = !!shieldAttempt;

  let weatherMultiplier = 1.0;
  if (activeWeather && !hasShield) {
    const meta = WEATHER_META[activeWeather.type as WeatherType];
    if (meta) weatherMultiplier = meta.marketMultiplier;
  }

  const listings = await Promise.all(
    PARTS.filter(p => p.id !== "body_core" && p.id !== "aura_basic").map(async (part) => {
      const priceRow = await getOrInitPrice(part.id);
      const baseRawPrice = priceRow?.currentPrice ?? MARKET_BASE_PRICES[part.rarity];
      const currentPrice = Math.round((baseRawPrice * weatherMultiplier) / 5) * 5;
      const base = MARKET_BASE_PRICES[part.rarity];
      const priceDelta = currentPrice - base;
      return {
        ...part,
        currentPrice,
        sellPrice: marketSellPrice(currentPrice),
        basePrice: base,
        priceDelta,
        trend: priceDelta > 5 ? "up" : priceDelta < -5 ? "down" : "flat",
        owned: unlocked.includes(part.id),
        equipped: [state.equippedBody, state.equippedAura, state.equippedAccessory].includes(part.id),
        totalBought: priceRow?.totalBought ?? 0,
        totalSold: priceRow?.totalSold ?? 0,
      };
    })
  );

  return NextResponse.json({
    listings,
    gcoins: state.gcoins,
    weatherMultiplier,
    activeWeather: activeWeather ? { type: activeWeather.type, description: activeWeather.description } : null,
    hasShield,
  });
}

// POST: buy or sell
export async function POST(req: Request) {
  const { action, partId } = await req.json() as { action: "BUY" | "SELL"; partId: string };
  const state = await getOptisState();
  const unlocked = parseUnlocked(state.unlockedParts);
  const part = PARTS.find(p => p.id === partId);
  if (!part) return NextResponse.json({ error: "パーツが見つかりません" }, { status: 404 });

  const priceRow = await getOrInitPrice(partId);
  if (!priceRow) return NextResponse.json({ error: "価格データ取得失敗" }, { status: 500 });

  // Apply the same weather multiplier as GET so displayed price = charged price
  const activeWeather = await prisma.economicWeather.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  const shieldAttempt = await prisma.quizAttempt.findFirst({
    where: { correct: true, shieldUntil: { gt: new Date() } },
    orderBy: { shieldUntil: "desc" },
  });
  let weatherMultiplier = 1.0;
  if (activeWeather && !shieldAttempt) {
    const meta = WEATHER_META[activeWeather.type as WeatherType];
    if (meta) weatherMultiplier = meta.marketMultiplier;
  }
  const effectivePrice = Math.round((priceRow.currentPrice * weatherMultiplier) / 5) * 5;

  const base = MARKET_BASE_PRICES[part.rarity];
  const todayStr = today();

  if (action === "BUY") {
    if (unlocked.includes(partId)) {
      return NextResponse.json({ error: "すでに所持しています" }, { status: 400 });
    }
    if (state.gcoins < effectivePrice) {
      return NextResponse.json({ error: `Gコインが不足しています (必要: ${effectivePrice}G)` }, { status: 400 });
    }

    const newTotalBought = priceRow.totalBought + 1;
    const newPrice = computeMarketPrice(base, newTotalBought, priceRow.totalSold);
    const history = (priceRow.history as { date: string; price: number }[]).slice(-29);
    history.push({ date: todayStr, price: newPrice });

    await prisma.$transaction([
      prisma.optisState.update({
        where: { id: state.id },
        data: {
          gcoins: state.gcoins - effectivePrice,
          unlockedParts: JSON.stringify([...unlocked, partId]),
        },
      }),
      prisma.partMarketPrice.update({
        where: { id: priceRow.id },
        data: { totalBought: newTotalBought, currentPrice: newPrice, history },
      }),
    ]);

    return NextResponse.json({ ok: true, paid: effectivePrice, newPrice });
  }

  if (action === "SELL") {
    if (!unlocked.includes(partId)) {
      return NextResponse.json({ error: "所持していないパーツです" }, { status: 400 });
    }
    const equipped = [state.equippedBody, state.equippedAura, state.equippedAccessory].includes(partId);
    if (equipped) {
      return NextResponse.json({ error: "装備中のパーツは売却できません" }, { status: 400 });
    }

    const sellPrice = marketSellPrice(effectivePrice);
    const newTotalSold = priceRow.totalSold + 1;
    const newPrice = computeMarketPrice(base, priceRow.totalBought, newTotalSold);
    const history = (priceRow.history as { date: string; price: number }[]).slice(-29);
    history.push({ date: todayStr, price: newPrice });

    await prisma.$transaction([
      prisma.optisState.update({
        where: { id: state.id },
        data: {
          gcoins: state.gcoins + sellPrice,
          unlockedParts: JSON.stringify(unlocked.filter(id => id !== partId)),
        },
      }),
      prisma.partMarketPrice.update({
        where: { id: priceRow.id },
        data: { totalSold: newTotalSold, currentPrice: newPrice, history },
      }),
    ]);

    return NextResponse.json({ ok: true, received: sellPrice, newPrice });
  }

  return NextResponse.json({ error: "action must be BUY or SELL" }, { status: 400 });
}
