import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_FEED = [
  {
    title: "【速報】円安進行中 — 海外ゲームパーツ価格が上昇の予測",
    body: "現在の為替レートでは輸入品の価格上昇が見込まれる。欲しいものリストの予算を今月中に確保せよ。市場データを要確認。",
    category: "ALERT",
  },
  {
    title: "【トレンド】タイパ(時間対効果)重視の時代 — 書籍カテゴリに注目",
    body: "「1冊の本が1000時間の経験値になる」という考え方が広まっている。今週Needs→書籍に1,000円以上使うとOptisの知力EXPが増加する。",
    category: "BOOST",
    effectJson: JSON.stringify({ type: "exp_multiplier", category: "書籍", multiplier: 2, expiresAt: null }),
  },
  {
    title: "【マーケット分析】ゴールドオーラの需要が低下中",
    body: "希少性が上昇しているにもかかわらず、購入者が少ない。今が狙い目かもしれない。マーケットの価格チャートを確認せよ。",
    category: "TREND",
  },
  {
    title: "【システム通知】ダーク・ウェブへようこそ",
    body: "このフィードにはリアルな経済情報が届く。ゲームの攻略情報として活用せよ。信用スコアが高いほど、より詳細な情報にアクセスできるようになる。",
    category: "NEWS",
  },
];

export async function GET() {
  const count = await prisma.feedItem.count();
  if (count === 0) {
    await prisma.feedItem.createMany({ data: DEFAULT_FEED });
  }

  const now = new Date();
  const items = await prisma.feedItem.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const { title, body, category, effectJson, expiresAt } = await req.json() as {
    title: string;
    body: string;
    category?: string;
    effectJson?: string;
    expiresAt?: string;
  };
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "title と body は必須です" }, { status: 400 });
  }
  const item = await prisma.feedItem.create({
    data: {
      title: title.trim(),
      body: body.trim(),
      category: category ?? "NEWS",
      effectJson: effectJson ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
