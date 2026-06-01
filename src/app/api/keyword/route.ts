import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TODAY = () => new Date().toISOString().slice(0, 10);

const SEED_KEYWORDS = [
  { word: "円安", ruby: "えんやす", english: "Yen Depreciation", emoji: "💱", gradient: "economy", body: "1ドル160円超の時代。輸入品が値上がりし、君の生活コストにも影響する。" },
  { word: "AI失業", ruby: "えーあいしつぎょう", english: "AI Displacement", emoji: "🤖", gradient: "tech", body: "AIが事務職・運転・翻訳を代替中。2030年までに3億人規模の転職が起きる予測。" },
  { word: "インフレ", ruby: "いんふれ", english: "Inflation", emoji: "📈", gradient: "economy", body: "物の値段が上がり続ける現象。お金の価値が下がるので、貯金だけでは損する時代。" },
  { word: "STEM格差", ruby: "すてむかくさ", english: "STEM Gap", emoji: "🔬", gradient: "tech", body: "理系・IT人材の年収は文系の1.5〜2倍。学びへの投資が将来の差を生む。" },
  { word: "少子化", ruby: "しょうしか", english: "Declining Birthrate", emoji: "👶", gradient: "social", body: "日本の出生数が過去最低を更新中。年金・医療・社会保障が全て影響を受ける。" },
  { word: "カーボンニュートラル", ruby: "", english: "Carbon Neutral", emoji: "🌍", gradient: "global", body: "2050年までに排出ゼロを目指す世界目標。エネルギー産業を根底から変える。" },
  { word: "量子コンピュータ", ruby: "りょうしこんぴゅーた", english: "Quantum Computer", emoji: "⚛️", gradient: "cyber", body: "従来の100兆倍速で計算。暗号・医薬品開発・AIを革命的に変える次世代技術。" },
  { word: "格差社会", ruby: "かくさしゃかい", english: "Inequality", emoji: "⚖️", gradient: "social", body: "上位1%が世界の富の半分を保有。知識と投資行動が個人の格差を決定づける。" },
  { word: "デジタル円", ruby: "でじたるえん", english: "Digital Yen", emoji: "💴", gradient: "cyber", body: "日本銀行が検討中のデジタル通貨。現金の消滅と経済追跡社会の始まりかも。" },
  { word: "宇宙ビジネス", ruby: "うちゅうびじねす", english: "Space Economy", emoji: "🚀", gradient: "global", body: "2040年代には100兆円市場と予測。民間宇宙旅行・衛星通信・資源採掘が競争中。" },
];

export async function GET() {
  const todayStr = TODAY();

  let keywords = await prisma.dailyKeyword.findMany({
    where: { date: todayStr },
    orderBy: { id: "asc" },
  });

  if (keywords.length === 0) {
    // Check if table is empty (no records at all), seed if so
    const count = await prisma.dailyKeyword.count();
    if (count === 0) {
      await prisma.dailyKeyword.createMany({
        data: SEED_KEYWORDS.map(kw => ({ ...kw, date: todayStr })),
      });
      keywords = await prisma.dailyKeyword.findMany({
        where: { date: todayStr },
        orderBy: { id: "asc" },
      });
    }
  }

  return NextResponse.json(keywords);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { word, ruby, english, emoji, gradient, body: bodyText, date } = body as {
    word: string;
    ruby?: string;
    english?: string;
    emoji?: string;
    gradient?: string;
    body: string;
    date: string;
  };

  if (!word || !bodyText || !date) {
    return NextResponse.json({ error: "word, body, date are required" }, { status: 400 });
  }

  const keyword = await prisma.dailyKeyword.create({
    data: {
      word,
      ruby: ruby ?? null,
      english: english ?? null,
      emoji: emoji ?? "💡",
      gradient: gradient ?? "economy",
      body: bodyText,
      date,
    },
  });

  return NextResponse.json(keyword, { status: 201 });
}
