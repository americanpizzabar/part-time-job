import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WEATHER_META, WeatherType } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function GET() {
  const weather = await prisma.economicWeather.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(weather ?? null);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { type, magnitude, description, expiresAt } = body as {
    type: WeatherType;
    magnitude?: number;
    description: string;
    expiresAt?: string;
  };

  if (!type || !description) {
    return NextResponse.json({ error: "type and description are required" }, { status: 400 });
  }

  // Deactivate all existing weather
  await prisma.economicWeather.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const weather = await prisma.economicWeather.create({
    data: {
      type,
      magnitude: magnitude ?? 1.0,
      description,
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  // Auto-create a feed item announcing the weather change
  const meta = WEATHER_META[type as WeatherType] ?? WEATHER_META.NEUTRAL;
  await prisma.feedItem.create({
    data: {
      title: `${meta.emoji} 経済ウェザー変更: ${meta.label}`,
      body: `${description}\n${meta.desc}`,
      category: "ALERT",
      isActive: true,
    },
  });

  return NextResponse.json(weather, { status: 201 });
}
