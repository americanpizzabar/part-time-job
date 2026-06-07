import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";
import { getOrCreateLearningProfile } from "@/lib/learningEngine";

// ─── バックアップ・スナップショット ──────────────────────────────────────────
// 全状態を1つのプレーンオブジェクトに集約する。BackupSnapshot.payload に
// JSON.stringify して保存する想定。

export async function buildSnapshot(): Promise<Record<string, unknown>> {
  const [
    optisState,
    transactions,
    mercariSales,
    quizAttempts,
    memoryCubes,
    missions,
    savingsGoals,
    presentationRequests,
    learningProfile,
    indexFunds,
    indexFundTxs,
    familyLoans,
  ] = await Promise.all([
    getOptisState(),
    prisma.transaction.findMany(),
    prisma.mercariSale.findMany(),
    prisma.quizAttempt.findMany(),
    prisma.memoryCube.findMany(),
    prisma.mission.findMany(),
    prisma.savingsGoal.findMany(),
    prisma.presentationRequest.findMany(),
    getOrCreateLearningProfile(),
    prisma.indexFund.findMany(),
    prisma.indexFundTx.findMany(),
    prisma.familyLoan.findMany(),
  ]);

  return {
    _meta: { version: 1, exportedAt: new Date().toISOString() },
    optisState,
    transactions,
    mercariSales,
    quizAttempts,
    memoryCubes,
    missions,
    savingsGoals,
    presentationRequests,
    learningProfile,
    indexFunds,
    indexFundTxs,
    familyLoans,
  };
}

// シングルトン(OptisState / LearningProfile)のスカラー値のみを復元する。
//
// PRAGMATIC RESTORE: 本アプリは単一DB(1ユーザー分のみ)で運用しているため、
// 取引履歴(Transaction / MercariSale / QuizAttempt 等)は復元時に
// 削除・再作成しない。誤った復元コードで履歴が消えるリスクを避けるための
// 意図的な設計判断。復元はあくまで「キャラクター(電子生命体)の状態」を
// 元に戻すことに限定する。各セクションは try/catch で囲み、欠損していても
// スキップして処理を継続する(防御的)。
export async function applySnapshot(payload: Record<string, unknown>): Promise<void> {
  // --- OptisState シングルトンの復元 ---
  try {
    const snap = payload.optisState as Record<string, unknown> | undefined;
    if (snap && typeof snap === "object") {
      const current = await getOptisState();
      // 復元対象スカラーフィールド(idやタイムスタンプは除外)
      const scalarKeys = [
        "experience",
        "creditScore",
        "theme",
        "equippedBody",
        "equippedAura",
        "equippedAccessory",
        "unlockedParts",
        "lastSpinDate",
        "lastChestWeek",
        "nmdDate",
        "freezeUntil",
        "awakening",
        "gcoins",
        "generation",
        "langMode",
        "wisdomPoints",
        "mercariTotal",
        "traderUnlocked",
      ] as const;
      const data: Record<string, unknown> = {};
      for (const k of scalarKeys) {
        if (k in snap && snap[k] !== undefined) {
          let v = snap[k];
          // 日時系はDateに戻す
          if ((k === "freezeUntil") && typeof v === "string") v = new Date(v);
          data[k] = v;
        }
      }
      if (Object.keys(data).length > 0) {
        await prisma.optisState.update({ where: { id: current.id }, data });
      }
    }
  } catch {
    // OptisState セクションが無い/壊れている場合はスキップ
  }

  // --- LearningProfile シングルトンの復元 ---
  try {
    const snap = payload.learningProfile as Record<string, unknown> | undefined;
    if (snap && typeof snap === "object") {
      const current = await getOrCreateLearningProfile();
      const scalarKeys = [
        "layer",
        "encounterRate",
        "lastAnsweredAt",
        "layerUpAt",
        "layerUpSeen",
        "parentAlertAt",
        "parentBoosted",
        "genreCurrent",
        "genreEconomy",
        "genreEnglish",
        "genreLogic",
        "levelCap",
      ] as const;
      const dateKeys = new Set(["lastAnsweredAt", "layerUpAt", "parentAlertAt"]);
      const data: Record<string, unknown> = {};
      for (const k of scalarKeys) {
        if (k in snap && snap[k] !== undefined) {
          let v = snap[k];
          if (dateKeys.has(k) && typeof v === "string") v = new Date(v);
          data[k] = v;
        }
      }
      if (Object.keys(data).length > 0) {
        await prisma.learningProfile.update({ where: { id: current.id }, data });
      }
    }
  } catch {
    // LearningProfile セクションが無い/壊れている場合はスキップ
  }
}

// 6桁の英数復元コードを生成(紛らわしい 0/O/1/I を除外)
export function generateRestoreCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
