import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";
import {
  WEATHER_META,
  WeatherType,
  rollWeather,
  effectiveWeatherMultiplier,
  creditRank,
  FORECAST_WISDOM_COST,
} from "@/lib/optis";

export const dynamic = "force-dynamic";

// 「次に来るウェザー」は active ウェザーIDをシードに決定論的に算出する。
// → weather/forecast の両エンドポイントで同じ結果を再現でき、保存不要。
function upcoming(activeWeatherId: number) {
  return rollWeather("next:" + activeWeatherId);
}

function reveal(activeWeatherId: number) {
  const next = upcoming(activeWeatherId);
  return {
    ...next,
    meta: WEATHER_META[next.type] ?? WEATHER_META.NEUTRAL,
    effectiveMultiplier: effectiveWeatherMultiplier(next.type as WeatherType, next.magnitude),
  };
}

async function findMarker(activeWeatherId: number) {
  return prisma.feedItem.findFirst({
    where: { category: "FORECAST", title: `forecast:${activeWeatherId}` },
  });
}

export async function GET() {
  const state = await getOptisState();
  const rank = creditRank(state.creditScore);
  const cost = Math.round(FORECAST_WISDOM_COST * (1 - rank.forecastDiscount));

  const active = await prisma.economicWeather.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!active) {
    return NextResponse.json({ wisdomPoints: state.wisdomPoints, cost, purchased: false, upcoming: null });
  }

  const marker = await findMarker(active.id);
  return NextResponse.json({
    wisdomPoints: state.wisdomPoints,
    cost,
    purchased: !!marker,
    upcoming: marker ? reveal(active.id) : null,
  });
}

export async function POST() {
  const state = await getOptisState();
  const rank = creditRank(state.creditScore);
  const cost = Math.round(FORECAST_WISDOM_COST * (1 - rank.forecastDiscount));

  const active = await prisma.economicWeather.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!active) {
    return NextResponse.json({ error: "現在の経済ウェザーが未確定です" }, { status: 400 });
  }

  const existing = await findMarker(active.id);
  if (existing) {
    return NextResponse.json({ ok: true, upcoming: reveal(active.id), wisdomPoints: state.wisdomPoints });
  }
  if (state.wisdomPoints < cost) {
    return NextResponse.json({ error: `知性ポイントが不足しています (必要: ${cost})` }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.optisState.update({
      where: { id: state.id },
      data: { wisdomPoints: state.wisdomPoints - cost },
    }),
    // 購入フラグは FeedItem をマーカー再利用(isActive:false で FEED には出さない)
    prisma.feedItem.create({
      data: { title: `forecast:${active.id}`, body: "INTEL購入済", category: "FORECAST", isActive: false },
    }),
  ]);

  return NextResponse.json({ ok: true, upcoming: reveal(active.id), wisdomPoints: state.wisdomPoints - cost });
}
