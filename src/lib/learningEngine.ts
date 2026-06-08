import { prisma } from "@/lib/prisma";

export const LAYER_LABELS: Record<number, string> = {
  1: "高校受験",
  2: "大学受験",
  3: "ビジネス/GMAT",
};

export const LAYER_UP_DIALOGUE: Record<number, string> = {
  2: "警戒レベル引き上げ。お前の脳の処理速度が高校レベルを突破した。次から大学受験レベルの暗号をハックする。覚悟しろ。",
  3: "異常値を検出。お前の知識が大学受験領域を超えた。次のフィールドはビジネスエリートの戦場だ。準備はいいか？",
};

export const LAYER_DOWN_DIALOGUE = "作戦変更。まずは解ける快感を取り戻せ。基礎を固めてから再挑戦だ。";

export async function getOrCreateLearningProfile() {
  const existing = await prisma.learningProfile.findFirst({ orderBy: { id: "asc" } });
  if (existing) return existing;
  return prisma.learningProfile.create({ data: {} });
}

export async function calibrateAfterAnswer(
  profileId: number,
  currentLayer: number,
  currentRate: number,
  responseMs: number | null,
  correct: boolean,
  parentAlertAt: Date | null,
) {
  // Rolling accuracy over last 5 attempts
  const recent = await prisma.quizAttempt.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { correct: true, responseMs: true },
  });

  const accuracy = recent.length > 0
    ? recent.filter(a => a.correct).length / recent.length
    : 0.5;

  // Layer adjustment (only when we have ≥3 data points)
  let newLayer = currentLayer;
  let layerChanged = false;
  if (recent.length >= 3) {
    if (accuracy >= 0.8 && currentLayer < 3) {
      newLayer = currentLayer + 1;
      layerChanged = true;
    } else if (accuracy <= 0.3 && currentLayer > 1) {
      newLayer = currentLayer - 1;
      layerChanged = true;
    }
  }

  // Encounter rate adjustment based on response speed and correctness
  let newRate = currentRate;
  const fast = responseMs !== null && responseMs < 12000;
  if (fast && correct) {
    newRate = Math.min(0.8, currentRate + 0.06);
  } else if (!correct || (responseMs !== null && responseMs > 40000)) {
    newRate = Math.max(0.05, currentRate - 0.04);
  }

  const layerUp = layerChanged && newLayer > currentLayer;
  // Parent alert: first time reaching an advanced layer (2 or 3)
  const shouldAlert = layerUp && newLayer >= 2 && !parentAlertAt;
  const nowDate = new Date();

  await prisma.learningProfile.update({
    where: { id: profileId },
    data: {
      layer: newLayer,
      encounterRate: newRate,
      lastAnsweredAt: nowDate,
      // 昇格時のみ祝福フラグを立てる(降格でホーム演出が誤発火しないように)
      ...(layerUp ? { layerUpAt: nowDate, layerUpSeen: false } : {}),
      ...(shouldAlert ? { parentAlertAt: nowDate } : {}),
    },
  });

  return { newLayer, layerChanged, layerUp, accuracy, newRate, shouldAlert };
}
