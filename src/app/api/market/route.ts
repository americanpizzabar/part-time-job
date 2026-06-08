import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";
import { PARTS, MARKET_BASE_PRICES, computeMarketPrice, marketSellPrice, WeatherType, TRADER_MARKET_DISCOUNT, effectiveWeatherMultiplier, creditRank, awakeningTier, effectiveSellFee } from "@/lib/optis";
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
    weatherMultiplier = effectiveWeatherMultiplier(activeWeather.type as WeatherType, activeWeather.magnitude);
  }

  const traderUnlocked = state.traderUnlocked;
  // 商人割引と信用ランク割引の大きい方を採用(加算スタックしない)
  const rank = creditRank(state.creditScore);
  const buyDiscount = Math.max(traderUnlocked ? TRADER_MARKET_DISCOUNT : 0, rank.marketDiscount);
  const discountSource = buyDiscount === 0 ? null
    : (rank.marketDiscount >= (traderUnlocked ? TRADER_MARKET_DISCOUNT : 0) && rank.marketDiscount > 0 ? "credit" : "trader");

  const aTier = awakeningTier(state.awakening);
  const sellFee = effectiveSellFee(aTier);

  // 最近のトレード履歴とP&L集計
  const recentTrades = await prisma.marketTrade.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const realizedPnl = recentTrades.reduce((acc, t) => {
    if (t.action === "SELL") return acc + t.price;
    if (t.action === "BUY") return acc - t.price;
    return acc;
  }, 0);

  const listings = await Promise.all(
    PARTS.filter(p => p.id !== "body_core" && p.id !== "aura_basic").map(async (part) => {
      const priceRow = await getOrInitPrice(part.id);
      const baseRawPrice = priceRow?.currentPrice ?? MARKET_BASE_PRICES[part.rarity];
      const weatherPrice = Math.round((baseRawPrice * weatherMultiplier) / 5) * 5;
      // 買値に割引(商人 or 信用ランクの大きい方)を適用。売値は覚醒ティアで手数料減少。
      const currentPrice = Math.round((weatherPrice * (1 - buyDiscount)) / 5) * 5;
      const sellPrice = marketSellPrice(weatherPrice, sellFee);
      const base = MARKET_BASE_PRICES[part.rarity];
      const priceDelta = currentPrice - base;
      // 未実現P&L: 最後の買値 vs 今の売値
      const lastBuy = recentTrades.find(t => t.partId === part.id && t.action === "BUY");
      const unrealizedPnl = lastBuy ? sellPrice - lastBuy.price : null;
      return {
        ...part,
        currentPrice,
        sellPrice,
        basePrice: base,
        priceDelta,
        trend: priceDelta > 5 ? "up" : priceDelta < -5 ? "down" : "flat",
        owned: unlocked.includes(part.id),
        equipped: [state.equippedBody, state.equippedAura, state.equippedAccessory].includes(part.id),
        totalBought: priceRow?.totalBought ?? 0,
        totalSold: priceRow?.totalSold ?? 0,
        unrealizedPnl,
      };
    })
  );

  return NextResponse.json({
    listings,
    gcoins: state.gcoins,
    weatherMultiplier,
    activeWeather: activeWeather ? { type: activeWeather.type, description: activeWeather.description } : null,
    hasShield,
    traderUnlocked,
    traderDiscount: TRADER_MARKET_DISCOUNT,
    rank,
    buyDiscount,
    discountSource,
    awakeningTier: aTier,
    sellFee,
    realizedPnl,
    recentTrades: recentTrades.slice(0, 10),
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
    weatherMultiplier = effectiveWeatherMultiplier(activeWeather.type as WeatherType, activeWeather.magnitude);
  }
  const weatherPrice = Math.round((priceRow.currentPrice * weatherMultiplier) / 5) * 5;
  // 買値は割引(商人 or 信用ランクの大きい方)を適用。売値は割引なし。
  const rank = creditRank(state.creditScore);
  const buyDiscount = Math.max(state.traderUnlocked ? TRADER_MARKET_DISCOUNT : 0, rank.marketDiscount);
  const buyPrice = Math.round((weatherPrice * (1 - buyDiscount)) / 5) * 5;

  const base = MARKET_BASE_PRICES[part.rarity];
  const todayStr = today();
  const aTier = awakeningTier(state.awakening);
  const sellFee = effectiveSellFee(aTier);

  if (action === "BUY") {
    if (unlocked.includes(partId)) {
      return NextResponse.json({ error: "すでに所持しています" }, { status: 400 });
    }
    if (state.gcoins < buyPrice) {
      return NextResponse.json({ error: `Gコインが不足しています (必要: ${buyPrice}G)` }, { status: 400 });
    }

    const newTotalBought = priceRow.totalBought + 1;
    const newPrice = computeMarketPrice(base, newTotalBought, priceRow.totalSold);
    const history = (priceRow.history as { date: string; price: number }[]).slice(-29);
    history.push({ date: todayStr, price: newPrice });

    await prisma.$transaction([
      prisma.optisState.update({
        where: { id: state.id },
        data: {
          gcoins: state.gcoins - buyPrice,
          unlockedParts: JSON.stringify([...unlocked, partId]),
        },
      }),
      prisma.partMarketPrice.update({
        where: { id: priceRow.id },
        data: { totalBought: newTotalBought, currentPrice: newPrice, history },
      }),
      prisma.marketTrade.create({
        data: { partId, action: "BUY", price: buyPrice, date: todayStr },
      }),
    ]);

    return NextResponse.json({ ok: true, paid: buyPrice, newPrice });
  }

  if (action === "SELL") {
    if (!unlocked.includes(partId)) {
      return NextResponse.json({ error: "所持していないパーツです" }, { status: 400 });
    }
    const equipped = [state.equippedBody, state.equippedAura, state.equippedAccessory].includes(partId);
    if (equipped) {
      return NextResponse.json({ error: "装備中のパーツは売却できません" }, { status: 400 });
    }

    // 覚醒ティアが高いほど手数料が低く、手取りが多い
    const sellPrice = marketSellPrice(weatherPrice, sellFee);
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
      prisma.marketTrade.create({
        data: { partId, action: "SELL", price: sellPrice, date: todayStr },
      }),
    ]);

    return NextResponse.json({ ok: true, received: sellPrice, newPrice, sellFee });
  }

  return NextResponse.json({ error: "action must be BUY or SELL" }, { status: 400 });
}
