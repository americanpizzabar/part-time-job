import { prisma } from "@/lib/prisma";
import { toDateStr, today } from "@/lib/dateUtils";
import { subDays, startOfWeek, endOfWeek } from "date-fns";
import { currentISOWeek } from "@/lib/optis";
import {
  levelFromExp,
  evolutionStage,
  formFromState,
  isInAfterschoolWindow,
  awakeningTier,
  generationBonus,
  BudgetResult,
} from "@/lib/optis";

// シングルトンのOptisStateを取得(なければ作成)
export async function getOptisState() {
  const existing = await prisma.optisState.findFirst({ orderBy: { id: "asc" } });
  if (existing) return existing;
  return prisma.optisState.create({ data: {} });
}

export function parseUnlocked(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// 週予算の達成状況を評価(直近の「完了した週」= 先週 を対象)
export async function evaluateWeeklyBudget(): Promise<BudgetResult | null> {
  const cfg = await prisma.aggregationConfig.findFirst({ orderBy: { id: "asc" } });
  const budget = cfg?.weeklyBudget ?? null;
  if (!budget || budget <= 0) return null;

  // 直近の完了週(先週月曜〜日曜)
  const lastWeekRef = subDays(new Date(), 7);
  const ws = toDateStr(startOfWeek(lastWeekRef, { weekStartsOn: 1 }));
  const we = toDateStr(endOfWeek(lastWeekRef, { weekStartsOn: 1 }));

  const txs = await prisma.transaction.findMany({
    where: { type: "EXPENSE", date: { gte: ws, lte: we } },
  });
  const spent = txs.reduce((s, t) => s + t.amount, 0);
  const usageRatio = Math.round((spent / budget) * 100);
  const withinBudget = spent <= budget;
  return {
    budget,
    spent,
    usageRatio,
    withinBudget,
    professional: withinBudget && usageRatio >= 90,
  };
}

// 経験値・形態・覚醒などの派生情報を算出
export async function computeDerived(experience: number, awakening: number, generation: number = 1) {
  const since = toDateStr(subDays(new Date(), 13));
  const txs = await prisma.transaction.findMany({
    where: { type: "EXPENSE", date: { gte: since } },
  });
  let needs = 0;
  let wants = 0;
  for (const t of txs) {
    if (t.needsWants === "NEEDS") needs += t.amount;
    else if (t.needsWants === "WANTS") wants += t.amount;
  }
  const total = needs + wants;
  const needsRatio = total > 0 ? Math.round((needs / total) * 100) : 50;
  const genBonus = generationBonus(generation);
  // 世代ボーナスで経験値を補正した上でレベル計算
  const effectiveExp = Math.round(experience * genBonus.expMultiplier);
  const lv = levelFromExp(effectiveExp);
  const budget = await evaluateWeeklyBudget();
  return {
    ...lv,
    stage: evolutionStage(lv.level),
    form: formFromState(needsRatio, budget),
    needsRatio,
    wantsRatio: 100 - needsRatio,
    needs14: needs,
    wants14: wants,
    budget,
    awakening,
    awakeningTier: awakeningTier(awakening),
    generation,
    generationBonus: genBonus,
  };
}

// ルーレット確変条件:
// 「支出0円」ではなく、当日にNeeds(自己投資)を記録した or
// 当日の支出が計画(日割り予算)の範囲内だった場合に確変。
export async function isRouletteBoostEligible(dateStr: string = today()): Promise<boolean> {
  const txs = await prisma.transaction.findMany({
    where: { type: "EXPENSE", date: dateStr },
  });
  // Needs記録があれば確変
  if (txs.some(t => t.needsWants === "NEEDS")) return true;

  // 当日支出が日割り予算内(かつ0より大)なら「計画通り」とみなす
  const cfg = await prisma.aggregationConfig.findFirst({ orderBy: { id: "asc" } });
  const weekly = cfg?.weeklyBudget ?? 0;
  if (weekly > 0) {
    const daily = weekly / 7;
    const spent = txs.reduce((s, t) => s + t.amount, 0);
    if (spent > 0 && spent <= daily) return true;
  }
  return false;
}

// シャドウ・チェイサー用「知性・やりくりスコア」(0-100)を今週分で算出。
// = 週予算の節約達成率(50%) + 今週のクイズ正答率×速度係数(50%)。
export interface IntelScore {
  score: number;        // 総合 0-100
  budgetScore: number;  // やりくりスコア 0-100
  quizScore: number;    // 知性スコア 0-100
  weekKey: string;
}
export async function computeIntelScore(): Promise<IntelScore> {
  const now = new Date();
  const ws = toDateStr(startOfWeek(now, { weekStartsOn: 1 }));
  const we = toDateStr(endOfWeek(now, { weekStartsOn: 1 }));

  // --- やりくりスコア(週予算に対する余裕度) ---
  const cfg = await prisma.aggregationConfig.findFirst({ orderBy: { id: "asc" } });
  const budget = cfg?.weeklyBudget ?? 0;
  let budgetScore = 50; // 予算未設定なら中立
  if (budget > 0) {
    const txs = await prisma.transaction.findMany({
      where: { type: "EXPENSE", date: { gte: ws, lte: we } },
    });
    const spent = txs.reduce((s, t) => s + t.amount, 0);
    const usage = spent / budget; // 1.0 で使い切り
    // 使うほど低下、超過で大きく低下。0%使用=100点, 100%使用=50点, 150%超=0点付近。
    budgetScore = Math.max(0, Math.min(100, Math.round(100 - usage * 50)));
  }

  // --- 知性スコア(今週のクイズ正答率×速度) ---
  const startOfWeekDate = startOfWeek(now, { weekStartsOn: 1 });
  const attempts = await prisma.quizAttempt.findMany({
    where: { createdAt: { gte: startOfWeekDate } },
    select: { correct: true, responseMs: true },
  });
  let quizScore = 0;
  if (attempts.length > 0) {
    const accuracy = attempts.filter(a => a.correct).length / attempts.length;
    const speeds = attempts.map(a => a.responseMs ?? 20000);
    const avgMs = speeds.reduce((s, v) => s + v, 0) / speeds.length;
    // 速度係数: 8秒以内=1.0, 30秒以上=0.6 で線形
    const speedFactor = Math.max(0.6, Math.min(1, 1 - (avgMs - 8000) / 55000));
    quizScore = Math.round(accuracy * 100 * speedFactor);
  }

  const score = Math.round(budgetScore * 0.5 + quizScore * 0.5);
  return { score, budgetScore, quizScore, weekKey: currentISOWeek(now) };
}

// 後出し不正検知: NMD申告日に放課後ウィンドウの支出が後から追加されていないか
export async function detectNmdFraud(nmdDate: string | null): Promise<boolean> {
  if (!nmdDate) return false;
  const txs = await prisma.transaction.findMany({
    where: { type: "EXPENSE", date: nmdDate },
  });
  return txs.some(t => {
    const when = t.reportedAt ?? t.createdAt;
    return isInAfterschoolWindow(new Date(when));
  });
}

// ─── Optisスタミナ(24時間エネルギー) ─────────────────────────────────
// 「給餌」= 会計の記録(ランチ写真含む)・NMD申告。最後の給餌から24時間で飢餓状態。
// 飢餓中は裏モード(ダークウェブ)とルーレットが封鎖される。
// 有効化直後に即飢餓にならないよう、設定変更時刻も給餌とみなす(猶予24h)。
export interface StaminaInfo {
  enabled: boolean;
  starving: boolean;
  hoursLeft: number; // 飢餓までの残り時間(飢餓中は0)
}

export async function computeStamina(nmdDate: string | null): Promise<StaminaInfo> {
  const cfg = await prisma.aggregationConfig.findFirst({ orderBy: { id: "asc" } });
  if (!cfg?.staminaEnabled) return { enabled: false, starving: false, hoursLeft: 24 };

  const lastTx = await prisma.transaction.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const feeds: number[] = [cfg.updatedAt.getTime()];
  if (lastTx) feeds.push(lastTx.createdAt.getTime());
  if (nmdDate) feeds.push(new Date(nmdDate + "T23:59:59").getTime());

  const hoursSince = (Date.now() - Math.max(...feeds)) / 3600000;
  return {
    enabled: true,
    starving: hoursSince > 24,
    hoursLeft: Math.max(0, Math.round((24 - hoursSince) * 10) / 10),
  };
}

// ─── ハッカーREP(名声)の集計 ─────────────────────────────────────────
// ダークウェブ実績をDBから集計してREPを算出する。テナントスコープは prisma 経由で自動適用。
import { REP_WEIGHTS, darkRepRank, nextDarkRepRank, DarkRepRank } from "@/lib/optis";

export interface DarkRep {
  rep: number;
  rank: DarkRepRank;
  next: { rank: DarkRepRank; remaining: number } | null;
  breakdown: { label: string; count: number; rep: number }[];
}

export async function computeDarkRep(): Promise<DarkRep> {
  const [decode, word, mainframe, ghost, craft, drop, quizCorrect] = await Promise.all([
    prisma.decodeMission.count({ where: { solvedAt: { not: null } } }),
    prisma.wordMission.count({ where: { solvedAt: { not: null } } }),
    prisma.mainframeSolve.count({ where: { correct: true } }),
    prisma.shadowGhost.count({ where: { defeated: true } }),
    prisma.rewardLog.count({ where: { source: "CRAFT" } }),
    prisma.rewardLog.count({ where: { source: "DROP" } }),
    prisma.quizAttempt.count({ where: { correct: true } }),
  ]);

  const rows = [
    { label: "データ解読",       count: decode,    rep: decode * REP_WEIGHTS.decode },
    { label: "ワード暗号解除",   count: word,      rep: word * REP_WEIGHTS.word },
    { label: "メインフレーム攻略", count: mainframe, rep: mainframe * REP_WEIGHTS.mainframe },
    { label: "ライバル撃破",     count: ghost,     rep: ghost * REP_WEIGHTS.ghost },
    { label: "パーツ密造",       count: craft,     rep: craft * REP_WEIGHTS.craft },
    { label: "シークレット回収", count: drop,      rep: drop * REP_WEIGHTS.drop },
    { label: "クイズ正解",       count: quizCorrect, rep: Math.min(100, quizCorrect * REP_WEIGHTS.quizCorrect) },
  ];
  const rep = rows.reduce((s, r) => s + r.rep, 0);
  const rank = darkRepRank(rep);
  const nx = nextDarkRepRank(rep);
  return {
    rep,
    rank,
    next: nx ? { rank: nx, remaining: nx.minRep - rep } : null,
    breakdown: rows.filter(r => r.count > 0),
  };
}
