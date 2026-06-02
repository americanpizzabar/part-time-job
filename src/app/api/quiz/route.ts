import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateLearningProfile, LAYER_LABELS } from "@/lib/learningEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();

  const profile = await getOrCreateLearningProfile();
  // Find active quiz at current layer or one below (for warmup)
  const quiz = await prisma.newsQuiz.findFirst({
    where: {
      isActive: true,
      layer: { in: [profile.layer, Math.max(1, profile.layer - 1)] },
    },
    orderBy: { createdAt: "desc" },
  });

  // Seed layer 2 and 3 quizzes if missing
  const hasLayer2 = await prisma.newsQuiz.count({ where: { layer: 2 } });
  if (hasLayer2 === 0) {
    await prisma.newsQuiz.createMany({
      data: [
        {
          question: "フィリップス曲線が示す関係として最も正しいのは？",
          options: JSON.stringify(["失業率と株価は正比例する", "インフレ率が高いほど失業率が低い傾向がある", "GDP成長率とインフレ率は常に等しい"]),
          correctIndex: 1,
          explanation: "フィリップス曲線はインフレ率と失業率のトレードオフ関係を示す。景気が良いと雇用が増え物価も上がる傾向がある。",
          weatherType: "INFLATION",
          layer: 2,
        },
        {
          question: "PER（株価収益率）の計算式は？",
          options: JSON.stringify(["株価 ÷ 1株当たり純資産", "株価 ÷ 1株当たり純利益", "純利益 ÷ 総資産"]),
          correctIndex: 1,
          explanation: "PER = 株価 ÷ EPS（1株当たり利益）。投資家が利益の何倍を払っているかを示す指標。",
          weatherType: "NEUTRAL",
          layer: 2,
        },
        {
          question: "量的緩和政策（QE）の主な目的は？",
          options: JSON.stringify(["政府の財政赤字を削減する", "中央銀行が国債等を買い市場に資金を供給する", "為替レートを固定する"]),
          correctIndex: 1,
          explanation: "量的緩和は中央銀行が市場から国債等を購入することで資金を供給し、金利を下げて景気を刺激する政策。",
          weatherType: "RATE_HIKE",
          layer: 2,
        },
      ],
    });
  }

  const hasLayer3 = await prisma.newsQuiz.count({ where: { layer: 3 } });
  if (hasLayer3 === 0) {
    await prisma.newsQuiz.createMany({
      data: [
        {
          question: "ポーターの5フォース分析で競争要因として含まれないのは？",
          options: JSON.stringify(["買い手の交渉力", "従業員の満足度", "新規参入の脅威"]),
          correctIndex: 1,
          explanation: "ポーターの5フォースは①既存競合②新規参入③代替品④買い手⑤売り手の5つ。従業員満足度は含まれない。",
          weatherType: "NEUTRAL",
          layer: 3,
        },
        {
          question: "行動ファイナンスの「損失回避バイアス」の説明として正しいのは？",
          options: JSON.stringify(["利益と損失を同等に評価する", "同額の損失は同額の利益より約2倍強く感じられる", "損失が出たら必ず売却判断をする"]),
          correctIndex: 1,
          explanation: "カーネマンの研究で、人は1万円の損失を1万円の利益の約2倍苦痛に感じる。これが塩漬け株や損切りできない原因。",
          weatherType: "DEFLATION",
          layer: 3,
        },
        {
          question: "DCF（割引キャッシュフロー）法で使う「割引率」は主に何を表す？",
          options: JSON.stringify(["インフレ率", "資本コスト（投資に求める最低利回り）", "税率"]),
          correctIndex: 1,
          explanation: "割引率は将来キャッシュフローを現在価値に換算するレート。通常はWACC（加重平均資本コスト）が使われる。",
          weatherType: "RATE_HIKE",
          layer: 3,
        },
      ],
    });
  }

  // Check if user has an active shield
  const shieldAttempt = await prisma.quizAttempt.findFirst({
    where: {
      correct: true,
      shieldUntil: { gt: now },
    },
    orderBy: { shieldUntil: "desc" },
  });

  const hasShield = !!shieldAttempt;
  const shieldUntil = shieldAttempt?.shieldUntil ?? null;

  if (!quiz) {
    return NextResponse.json({ quiz: null, hasShield, shieldUntil });
  }

  // Parse options
  let options: string[] = [];
  try {
    options = JSON.parse(quiz.options);
  } catch {
    options = [];
  }

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      question: quiz.question,
      options,
      weatherType: quiz.weatherType,
      explanation: quiz.explanation,
    },
    hasShield,
    shieldUntil,
    layer: profile.layer,
    layerLabel: LAYER_LABELS[profile.layer] ?? "高校受験",
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { question, options, correctIndex, explanation, weatherType } = body as {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    weatherType?: string;
  };

  if (!question || !options || options.length !== 3 || correctIndex === undefined || !explanation) {
    return NextResponse.json({ error: "question, options (3), correctIndex, explanation are required" }, { status: 400 });
  }

  // Deactivate old quizzes
  await prisma.newsQuiz.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const quiz = await prisma.newsQuiz.create({
    data: {
      question,
      options: JSON.stringify(options),
      correctIndex,
      explanation,
      weatherType: weatherType ?? "NEUTRAL",
      isActive: true,
    },
  });

  return NextResponse.json(quiz, { status: 201 });
}
