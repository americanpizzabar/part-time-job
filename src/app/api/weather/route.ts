import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { toDateStr } from "@/lib/dateUtils";
import {
  WEATHER_META,
  WeatherType,
  rollWeather,
  effectiveWeatherMultiplier,
  WEATHER_MIN_DAYS,
} from "@/lib/optis";

export const dynamic = "force-dynamic";

// active なウェザーを全停止し、新しいウェザーを作成 + 告知 FeedItem を投稿する。
async function createWeather(type: WeatherType, magnitude: number, days: number, description: string) {
  await prisma.economicWeather.updateMany({ where: { isActive: true }, data: { isActive: false } });
  const expiresAt = addDays(new Date(), days);
  const weather = await prisma.economicWeather.create({
    data: { type, magnitude, description, isActive: true, expiresAt },
  });
  const meta = WEATHER_META[type] ?? WEATHER_META.NEUTRAL;
  await prisma.feedItem.create({
    data: {
      title: `${meta.emoji} 経済ウェザー変更: ${meta.label}`,
      body: `${description}\n${meta.desc}`,
      category: "ALERT",
      isActive: true,
    },
  });
  return weather;
}

export async function GET() {
  const now = new Date();
  let weather = await prisma.economicWeather.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  // 未設定 or 期限切れ → 自動ローテーション(日付シードで決定論的)
  const expired = !!(weather?.expiresAt && weather.expiresAt <= now);
  if (!weather || expired) {
    const seed = toDateStr(now) + ":" + (weather?.id ?? 0);
    const { type, magnitude, days } = rollWeather(seed);
    const meta = WEATHER_META[type] ?? WEATHER_META.NEUTRAL;
    weather = await createWeather(type, magnitude, days, `自動ローテーション: ${meta.label}`);
  }

  const meta = WEATHER_META[weather.type as WeatherType] ?? WEATHER_META.NEUTRAL;
  return NextResponse.json({
    ...weather,
    meta,
    effectiveMultiplier: effectiveWeatherMultiplier(weather.type as WeatherType, weather.magnitude),
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { type, magnitude, days, description, expiresAt } = body as {
    type: WeatherType;
    magnitude?: number;
    days?: number;
    description: string;
    expiresAt?: string;
  };

  if (!type || !description) {
    return NextResponse.json({ error: "type and description are required" }, { status: 400 });
  }

  // expiresAt が明示されていればその日数、なければ days、それも無ければ最小日数
  const durationDays = expiresAt
    ? Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
    : days ?? WEATHER_MIN_DAYS;

  const weather = await createWeather(type, magnitude ?? 1.0, durationDays, description);
  return NextResponse.json(weather, { status: 201 });
}
