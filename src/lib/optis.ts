// ============================================================
// Optis ゲームロジック(進化・経験値・ルーレット・パーツ)
// ============================================================

export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY";
export type OptisForm = "LOGICAL" | "CREATIVE" | "HYBRID" | "PROFESSIONAL";

// --- 経験値 / レベル ---------------------------------------
// レベルLからL+1に必要な経験値
export function expToNext(level: number): number {
  return 80 + (level - 1) * 50;
}

// 累計経験値からレベルと次レベルまでの情報を算出
export function levelFromExp(exp: number): {
  level: number;
  intoLevel: number; // 現レベルで貯めた分
  needed: number; // 次レベルに必要な分
  totalForNext: number; // 次レベル到達に必要な累計
} {
  let level = 1;
  let remaining = exp;
  while (remaining >= expToNext(level)) {
    remaining -= expToNext(level);
    level += 1;
  }
  const needed = expToNext(level);
  return {
    level,
    intoLevel: remaining,
    needed,
    totalForNext: exp + (needed - remaining),
  };
}

// --- 進化ステージ / 形態 -----------------------------------
export function evolutionStage(level: number): 1 | 2 | 3 {
  if (level >= 12) return 3;
  if (level >= 5) return 2;
  return 1;
}

// 週予算の達成状況(直近の完了週)
export interface BudgetResult {
  budget: number;      // 設定された週予算
  spent: number;       // その週の支出
  usageRatio: number;  // 消費率(%)
  withinBudget: boolean; // オーバーしていない
  professional: boolean; // 90%以上消費 & オーバーなし = やりくりの達人
}

// 形態を決定: やりくり成功(プロフェッショナル)を最優先評価し、
// 次にNeeds(自己投資)比率で分岐する。
export function formFromState(needsRatio: number, budget: BudgetResult | null): OptisForm {
  if (budget && budget.professional) return "PROFESSIONAL";
  if (needsRatio >= 60) return "LOGICAL";
  if (needsRatio <= 40) return "CREATIVE";
  return "HYBRID";
}

// 旧API互換(週予算が無い場合)
export function formFromNeedsRatio(needsRatio: number): OptisForm {
  return formFromState(needsRatio, null);
}

export const FORM_META: Record<OptisForm, { label: string; color: string; accent: string; desc: string }> = {
  PROFESSIONAL: {
    label: "プロフェッショナル形態",
    color: "#10b981",
    accent: "#34d399",
    desc: "予算を90%以上使い切りつつ1円もオーバーしなかった、やりくりの達人の姿。最も美しくエネルギーに満ちている。",
  },
  LOGICAL: {
    label: "ロジカル・ソリッド形態",
    color: "#3b82f6",
    accent: "#60a5fa",
    desc: "結晶化したボディ。青い発光が強い、計画的な姿。",
  },
  CREATIVE: {
    label: "クリエイティブ・ネオン形態",
    color: "#ec4899",
    accent: "#f472b6",
    desc: "ストリート風パーツ。ピンクの発光が強い、自由な姿。",
  },
  HYBRID: {
    label: "バランス・ハイブリッド形態",
    color: "#8b5cf6",
    accent: "#a78bfa",
    desc: "中庸を保つ流線型のデザイン。",
  },
};

// --- 覚醒(Needs自己投資による武器/パーツ強化) ------------------
// 覚醒値 → ティア(0〜4)。装備エフェクトの強さに反映。
export function awakeningTier(awakening: number): number {
  if (awakening >= 40) return 4;
  if (awakening >= 25) return 3;
  if (awakening >= 12) return 2;
  if (awakening >= 4) return 1;
  return 0;
}

export const AWAKENING_LABEL: Record<number, string> = {
  0: "ノーマル",
  1: "+1 覚醒",
  2: "+2 覚醒",
  3: "+3 オーバードライブ",
  4: "+4 トランセンド",
};

// Needs購入1件あたりの覚醒上昇
export const AWAKENING_PER_NEEDS = 2;

export const STAGE_LABEL: Record<number, string> = {
  1: "コア",
  2: "第2形態",
  3: "最終形態",
};

// --- AIブレイン(性格タイプ) -----------------------------------
export type BrainType = "IMPULSIVE" | "ANALYTICAL" | "FRUGAL" | "BALANCED";

export const BRAIN_META: Record<BrainType, { label: string; emoji: string; color: string; desc: string }> = {
  IMPULSIVE: {
    label: "熱血・直感型",
    emoji: "🔥",
    color: "#ef4444",
    desc: "行動力No.1。即決で動くが、時に立ち止まると最強になれる。",
  },
  ANALYTICAL: {
    label: "冷静・参謀型",
    emoji: "🧠",
    color: "#3b82f6",
    desc: "データを読んで最適解を出す知将タイプ。",
  },
  FRUGAL: {
    label: "堅実・倹約型",
    emoji: "💎",
    color: "#10b981",
    desc: "Needsへの投資を大切にする計画の鉄人。",
  },
  BALANCED: {
    label: "バランス・万能型",
    emoji: "⚖️",
    color: "#8b5cf6",
    desc: "状況を問わず柔軟に対応できる万能型。",
  },
};

// 性格別タップメッセージ
export const BRAIN_MOTIONS: Record<BrainType, { id: string; text: string; anim: string }[]> = {
  IMPULSIVE: [
    { id: "warn", text: "おい！またすぐ買おうとしてるだろ！裏画面でシミュレーションしてからにしろ！🔥", anim: "optis-bounce" },
    { id: "hype", text: "その直感、時には当たる！でも財布と要相談だぞ！", anim: "optis-spin" },
    { id: "cool", text: "衝動買い前に3秒待ってみな。それだけでかなり変わるぞ。", anim: "optis-tilt" },
    { id: "fire", text: "熱血エネルギー充填中⚡ 次のプロジェクトに向けて貯めるぞ！", anim: "optis-pulse" },
  ],
  ANALYTICAL: [
    { id: "tip", text: "前回の検討から3日が経過しました。今が買い時かもしれません。", anim: "optis-pulse" },
    { id: "data", text: "データ分析完了。今週の支出ペースは計画通りです。優秀。", anim: "optis-tilt" },
    { id: "sim", text: "裏画面でシミュレーションしてみよう。最適ルートが見えるはずだ。", anim: "optis-jump" },
    { id: "plan", text: "熟考型の直感は正確だ。そのまま慎重に進め。🧠", anim: "optis-bounce" },
  ],
  FRUGAL: [
    { id: "praise", text: "Needsへの投資は自分への最高の贈り物だ。そのまま続けろ！💎", anim: "optis-bounce" },
    { id: "goal", text: "貯金ペースが順調。このままプロジェクトを達成しよう！", anim: "optis-spin" },
    { id: "evolve", text: "今週も予算内で最高のやりくり。プロフェッショナル形態に近づいてるぞ。", anim: "optis-pulse" },
    { id: "power", text: "倹約型のエネルギーは静かで強い。ドンドン充填してくぞ。", anim: "optis-jump" },
  ],
  BALANCED: [
    { id: "wave", text: "やっほー！今日もえらい！", anim: "optis-bounce" },
    { id: "spin", text: "エネルギー充填、いい感じ⚡", anim: "optis-spin" },
    { id: "wink", text: "Needsを意識して使えると、プロフェッショナル形態に近づくぞ😉", anim: "optis-tilt" },
    { id: "pulse", text: "コアがドクン…って鳴ってる！", anim: "optis-pulse" },
    { id: "jump", text: "次の進化まであと少し…かも？", anim: "optis-jump" },
  ],
};

export function randomMotion(brain: BrainType = "BALANCED") {
  const list = BRAIN_MOTIONS[brain];
  return list[Math.floor(Math.random() * list.length)];
}

// --- ギルド同盟 ------------------------------------------------
// 現在のISO週番号文字列(例: "2026-W23")
export function currentISOWeek(d: Date = new Date()): string {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = d.getTime() - startOfWeek1.getTime();
  const week = Math.ceil((diff / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ギルドオーラ: 全員が今週達成済みかチェック
export function isGuildAuraActive(members: { budgetMetWeek: string | null }[]): boolean {
  if (members.length < 2) return false;
  const w = currentISOWeek();
  return members.every(m => m.budgetMetWeek === w);
}

// --- Gコイン報酬テーブル --------------------------------------
export const GCOIN_REWARDS: Record<Rarity, number> = {
  COMMON: 5,
  UNCOMMON: 12,
  RARE: 30,
  LEGENDARY: 80,
};
export const GCOIN_BUDGET_CLEAR = 20; // 週予算達成ボーナス
export const GCOIN_BANK_RATE = 0.10;  // 週利10%

// --- ルーレット(ジャックポット) -----------------------------
export const RARITY_META: Record<Rarity, { label: string; color: string; glow: string }> = {
  COMMON: { label: "コモン", color: "#94a3b8", glow: "#cbd5e1" },
  UNCOMMON: { label: "アンコモン", color: "#22c55e", glow: "#86efac" },
  RARE: { label: "レア", color: "#3b82f6", glow: "#93c5fd" },
  LEGENDARY: { label: "レジェンダリー", color: "#f59e0b", glow: "#fcd34d" },
};

const NORMAL_ODDS: [Rarity, number][] = [
  ["COMMON", 0.70],
  ["UNCOMMON", 0.20],
  ["RARE", 0.09],
  ["LEGENDARY", 0.01],
];
const BOOSTED_ODDS: [Rarity, number][] = [
  ["COMMON", 0.40],
  ["UNCOMMON", 0.30],
  ["RARE", 0.25],
  ["LEGENDARY", 0.05],
];

export function rollRarity(boosted: boolean): Rarity {
  const odds = boosted ? BOOSTED_ODDS : NORMAL_ODDS;
  const r = Math.random();
  let acc = 0;
  for (const [rarity, p] of odds) {
    acc += p;
    if (r <= acc) return rarity;
  }
  return "COMMON";
}

// --- パーツカタログ ----------------------------------------
export interface Part {
  id: string;
  type: "body" | "aura" | "accessory";
  name: string;
  rarity: Rarity;
  color: string; // 発光/表示色
  emoji?: string;
  seasonal?: boolean; // 季節/期間限定
  trader?: boolean; // 商人属性(メルカリ売上)で解放される限定パーツ
  bug?: boolean; // バグパーツ(裏モードのデータ解読でのみ解放)
}

export const PARTS: Part[] = [
  // ── COMMON ─────────────────────────────────────────────────────────────────
  { id: "body_core", type: "body", name: "コア・ボディ", rarity: "COMMON", color: "#64748b" },
  { id: "aura_basic", type: "aura", name: "ベーシック・オーラ", rarity: "COMMON", color: "#94a3b8" },
  // ── UNCOMMON ───────────────────────────────────────────────────────────────
  { id: "aura_cyan", type: "aura", name: "ネオンシアン・オーラ", rarity: "UNCOMMON", color: "#06b6d4" },
  { id: "aura_magenta", type: "aura", name: "マゼンタ・オーラ", rarity: "UNCOMMON", color: "#ec4899" },
  { id: "aura_summer", type: "aura", name: "サマーウェーブ・オーラ", rarity: "UNCOMMON", color: "#0ea5e9", emoji: "🌊", seasonal: true },
  { id: "acc_cap", type: "accessory", name: "ストリートキャップ", rarity: "UNCOMMON", color: "#ef4444", emoji: "🧢" },
  { id: "acc_sunglasses", type: "accessory", name: "サマーサングラス", rarity: "UNCOMMON", color: "#fbbf24", emoji: "😎", seasonal: true },
  // ── RARE ───────────────────────────────────────────────────────────────────
  { id: "aura_gold", type: "aura", name: "ゴールド・オーラ", rarity: "RARE", color: "#f59e0b" },
  { id: "aura_sakura", type: "aura", name: "桜吹雪オーラ", rarity: "RARE", color: "#f9a8d4", emoji: "🌸", seasonal: true },
  { id: "aura_autumn", type: "aura", name: "オータム・グロウ・オーラ", rarity: "RARE", color: "#ea580c", emoji: "🍂", seasonal: true },
  { id: "aura_snow", type: "aura", name: "スノウフレーク・オーラ", rarity: "RARE", color: "#bae6fd", emoji: "❄️", seasonal: true },
  { id: "acc_glasses", type: "accessory", name: "サイバーゴーグル", rarity: "RARE", color: "#0ea5e9", emoji: "🕶️" },
  { id: "acc_crown", type: "accessory", name: "クリスタル・クラウン", rarity: "RARE", color: "#22d3ee", emoji: "👑" },
  { id: "acc_santa", type: "accessory", name: "サンタハット", rarity: "RARE", color: "#dc2626", emoji: "🎅", seasonal: true },
  // ── LEGENDARY ──────────────────────────────────────────────────────────────
  { id: "aura_rainbow", type: "aura", name: "プリズム・オーラ", rarity: "LEGENDARY", color: "#a855f7", emoji: "🌈" },
  { id: "acc_halo", type: "accessory", name: "レジェンド・ヘイロー", rarity: "LEGENDARY", color: "#fde047", emoji: "💫" },
  // ── TRADER(商人属性: メルカリ売上で解放される限定サイバーパーツ) ──────────────
  { id: "acc_gold_visor", type: "accessory", name: "ゴールド・バイザー", rarity: "LEGENDARY", color: "#fbbf24", emoji: "🥽", trader: true },
  { id: "acc_digital_watch", type: "accessory", name: "デジタル・ウォッチ", rarity: "RARE", color: "#fcd34d", emoji: "⌚", trader: true },
  // ── BUG(バグパーツ: 裏モードのデータ解読でのみ解放されるデジタルノイズ系) ──────
  { id: "aura_glitch", type: "aura", name: "グリッチ・ノイズ・オーラ", rarity: "LEGENDARY", color: "#22c55e", emoji: "🟩", bug: true },
  { id: "acc_bug_wings", type: "accessory", name: "バグ・ウイング", rarity: "LEGENDARY", color: "#34d399", emoji: "🦾", bug: true },
  { id: "acc_terminal", type: "accessory", name: "ターミナル・ゴーグル", rarity: "RARE", color: "#10b981", emoji: "👓", bug: true },
];

// 商人(トレーダー)パーツのID一覧 — メルカリ売上で解放
export const TRADER_PART_IDS = PARTS.filter(p => p.trader).map(p => p.id);

// バグパーツのID一覧 — 裏モードのデータ解読で解放
export const BUG_PART_IDS = PARTS.filter(p => p.bug).map(p => p.id);

// ダークウェブでの商人割引率(トレーダー属性解放時)
export const TRADER_MARKET_DISCOUNT = 0.15;

export type QuizGenre = "CURRENT" | "ECONOMY" | "ENGLISH" | "LOGIC";

export const GENRE_META: Record<QuizGenre, { label: string; emoji: string; color: string }> = {
  CURRENT: { label: "時事・社会", emoji: "📰", color: "#38bdf8" },
  ECONOMY: { label: "経済・金融", emoji: "💹", color: "#34d399" },
  ENGLISH: { label: "国際・英語", emoji: "🌐", color: "#a78bfa" },
  LOGIC:   { label: "ロジカル思考", emoji: "🧩", color: "#fb923c" },
};

// レイヤー → 学齢ラベル(親キャップ設定用)
export const LAYER_GRADE_LABEL: Record<number, string> = {
  1: "高校生レベル",
  2: "大学生レベル",
  3: "大人レベル",
};

export function getPart(id: string | null | undefined): Part | undefined {
  if (!id) return undefined;
  return PARTS.find(p => p.id === id);
}

// レアリティから報酬を決定: パーツ(未所持があれば優先) or 経験値
export function pickReward(
  rarity: Rarity,
  unlocked: string[]
): { rewardId: string; label: string; part?: Part; exp?: number } {
  const candidates = PARTS.filter(
    p => p.rarity === rarity && p.id !== "body_core" && p.id !== "aura_basic" && !unlocked.includes(p.id)
  );
  if (candidates.length > 0) {
    const part = candidates[Math.floor(Math.random() * candidates.length)];
    return { rewardId: part.id, label: `${part.emoji ?? "✨"} ${part.name}`, part };
  }
  // 既に所持済みなら経験値ボーナス
  const expByRarity: Record<Rarity, number> = {
    COMMON: 20,
    UNCOMMON: 40,
    RARE: 80,
    LEGENDARY: 200,
  };
  const exp = expByRarity[rarity];
  return { rewardId: `exp:${exp}`, label: `経験値 +${exp} EXP`, exp };
}

// 仕分け1件あたりの基礎経験値
export const EXP_PER_RECORD = 15;
export const EXP_NEEDS_BONUS = 10; // Needs仕分け時の追加

// 放課後ウィンドウ(NMD判定対象)
export const AFTERSCHOOL_START_HOUR = 16;
export const AFTERSCHOOL_END_HOUR = 19;

export function isInAfterschoolWindow(d: Date): boolean {
  const h = d.getHours();
  return h >= AFTERSCHOOL_START_HOUR && h < AFTERSCHOOL_END_HOUR;
}

// Dark Web Mode 解放時間帯(21:00-24:00) → バジェット・シミュレーター
export function isDarkWebHour(d: Date = new Date()): boolean {
  const h = d.getHours();
  return h >= 21 && h <= 23;
}

// --- マイ・プロジェクト(クラファン型 親子マッチング投資) ----------
// 子の計画的積立1回あたりに連動して親が放出するブースト額。
// 比率 = 親出資総額 / 自己原資目標。
export function boostPerContribution(plannedAmount: number, selfTarget: number, parentBoostTotal: number): number {
  if (selfTarget <= 0) return 0;
  return Math.round(plannedAmount * (parentBoostTotal / selfTarget));
}

export interface ProjectProgress {
  total: number;        // selfSaved + boostReleased
  selfSaved: number;
  boostReleased: number;
  targetAmount: number;
  selfTarget: number;
  parentBoostTotal: number;
  progressPct: number;
  selfPct: number;
  remaining: number;
  completed: boolean;
}

export function projectProgress(p: {
  selfSaved: number;
  boostReleased: number;
  targetAmount: number;
  selfTarget: number;
  parentBoostTotal: number;
}): ProjectProgress {
  const total = p.selfSaved + p.boostReleased;
  return {
    total,
    selfSaved: p.selfSaved,
    boostReleased: p.boostReleased,
    targetAmount: p.targetAmount,
    selfTarget: p.selfTarget,
    parentBoostTotal: p.parentBoostTotal,
    progressPct: p.targetAmount > 0 ? Math.min(100, Math.round((total / p.targetAmount) * 100)) : 0,
    selfPct: p.selfTarget > 0 ? Math.min(100, Math.round((p.selfSaved / p.selfTarget) * 100)) : 0,
    remaining: Math.max(0, p.targetAmount - total),
    completed: total >= p.targetAmount,
  };
}

// ─── ダイナミック・マーケット ─────────────────────────────────────────
// レアリティ別の基準価格(Gコイン)
export const MARKET_BASE_PRICES: Record<Rarity, number> = {
  COMMON: 50,
  UNCOMMON: 120,
  RARE: 300,
  LEGENDARY: 800,
};

export const MARKET_SELL_FEE = 0.15; // 売却手数料15%

// 需給バランスに基づいた価格計算: 基準価格の30%〜300%で変動
export function computeMarketPrice(basePrice: number, totalBought: number, totalSold: number): number {
  const net = totalBought - totalSold;
  const vol = Math.max(1, totalBought + totalSold);
  const multiplier = Math.max(0.3, Math.min(3.0, 1 + 0.06 * (net / vol)));
  return Math.round((basePrice * multiplier) / 5) * 5; // 5G単位で丸め
}

export function marketSellPrice(currentPrice: number, fee: number = MARKET_SELL_FEE): number {
  return Math.floor(currentPrice * (1 - fee) / 5) * 5;
}

// 覚醒(自己投資の蓄積)ティアが高いほど売却手数料が下がる。
// tier 0..4 → 手数料 15% → 7%(最低5%でクランプ)。「自己投資が取引上手にする」を表現。
export function effectiveSellFee(awakeningTier: number): number {
  return Math.max(0.05, MARKET_SELL_FEE - Math.max(0, awakeningTier) * 0.02);
}

// ─── 世代引き継ぎボーナス(転生システム) ─────────────────────────────
export interface GenerationBonus {
  expMultiplier: number;   // 1.0 + (gen-1) * 0.1
  darkWebHour: number;     // dark web解放時刻(デフォルト21; gen3+で20, gen5+で19)
  advancedAdvice: boolean; // gen2+でOptisのアドバイスが高度になる
}

export function generationBonus(gen: number): GenerationBonus {
  return {
    expMultiplier: 1 + (gen - 1) * 0.10,
    darkWebHour: gen >= 5 ? 19 : gen >= 3 ? 20 : 21,
    advancedAdvice: gen >= 2,
  };
}

export const CRYSTALLIZE_MIN_LEVEL = 15; // 転生に必要な最小レベル
export const CRYSTALLIZE_MIN_STAGE = 3;  // 転生には最終形態到達が必須

// ─── ファミリー・クレジット ──────────────────────────────────────────
export const LOAN_COMPLETE_CREDIT_BOOST = 20;
export const LOAN_DEFAULT_INTEREST_RATE = 0.05; // 月5%

// 月額返済額計算: 元金均等 + 固定利息
export function calcMonthlyPayment(principal: number, months: number, interestPerMonth: number): number {
  return Math.ceil(principal / months) + interestPerMonth;
}

// ─── シャドウ・フィード デフォルト種別色 ───────────────────────────
export const FEED_CATEGORY_META: Record<string, { color: string; label: string; icon: string }> = {
  NEWS:  { color: "#22d3ee", label: "ニュース",   icon: "📡" },
  ALERT: { color: "#ef4444", label: "アラート",   icon: "⚠️" },
  BOOST: { color: "#f59e0b", label: "ブースト",   icon: "⚡" },
  TREND: { color: "#a855f7", label: "トレンド",   icon: "📈" },
};

// ─── 自己投資カテゴリ ─────────────────────────────────────────────────
export const ASSET_CATEGORIES = ["STEM", "ART_CULTURE", "HEALTH_SOCIAL"] as const;
export type AssetCategory = typeof ASSET_CATEGORIES[number];
export const ASSET_META: Record<AssetCategory, { label: string; emoji: string; color: string; desc: string }> = {
  STEM:          { label: "理系・技術",   emoji: "🔬", color: "#3b82f6", desc: "科学・プログラミング・塾・文房具" },
  ART_CULTURE:   { label: "感性・文化",   emoji: "🎨", color: "#ec4899", desc: "本・映画・音楽・美術・推し活" },
  HEALTH_SOCIAL: { label: "体・社会",     emoji: "💪", color: "#10b981", desc: "部活・スポーツ・友人関係・健康" },
};

// ─── 経済ウェザー ─────────────────────────────────────────────────────
export type WeatherType = "NEUTRAL" | "INFLATION" | "DEFLATION" | "YEN_STRONG" | "YEN_WEAK" | "RATE_HIKE";
export const WEATHER_META: Record<WeatherType, { label: string; emoji: string; color: string; marketMultiplier: number; desc: string }> = {
  NEUTRAL:   { label: "平常",        emoji: "⛅", color: "#94a3b8", marketMultiplier: 1.0,  desc: "特に経済異常なし" },
  INFLATION: { label: "インフレ警報", emoji: "🔥", color: "#ef4444", marketMultiplier: 1.2,  desc: "物価上昇中。パーツ価格+20%" },
  DEFLATION: { label: "デフレ注意",  emoji: "❄️", color: "#06b6d4", marketMultiplier: 0.85, desc: "物価下落中。今が買い時" },
  YEN_STRONG:{ label: "円高",        emoji: "💹", color: "#10b981", marketMultiplier: 0.8,  desc: "海外パーツが割安に" },
  YEN_WEAK:  { label: "円安警報",    emoji: "⚠️", color: "#f59e0b", marketMultiplier: 1.15, desc: "輸入品が値上がり中" },
  RATE_HIKE: { label: "利上げ",      emoji: "🏦", color: "#8b5cf6", marketMultiplier: 1.05, desc: "金利上昇。銀行の利息が増加" },
};

// ─── 動的な経済ウェザー(自動ローテーション) ───────────────────────────
// 文字列シードの決定論的擬似乱数(FNV-1a)。並行GETでも同じ結果になる。
export function seededInt(seed: string, mod: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % Math.max(1, mod);
}

export const WEATHER_TYPES: WeatherType[] = ["NEUTRAL", "INFLATION", "DEFLATION", "YEN_STRONG", "YEN_WEAK", "RATE_HIKE"];
export const WEATHER_MIN_DAYS = 2;
export const WEATHER_MAX_DAYS = 4;

// シードからウェザーを決定(type / 深刻度 / 継続日数)。同じシードなら必ず同じ結果。
export function rollWeather(seed: string): { type: WeatherType; magnitude: number; days: number } {
  const type = WEATHER_TYPES[seededInt(seed + ":type", WEATHER_TYPES.length)];
  const magnitude = Math.round((0.6 + seededInt(seed + ":mag", 18) / 10) * 100) / 100; // 0.6 .. 2.3
  const days = WEATHER_MIN_DAYS + seededInt(seed + ":days", WEATHER_MAX_DAYS - WEATHER_MIN_DAYS + 1);
  return { type, magnitude, days };
}

// magnitude を 1.0 を軸に増幅した「有効倍率」。
// weather と market が必ず同じ値を使う唯一の関数(整合の単一化)。
export function effectiveWeatherMultiplier(type: WeatherType, magnitude: number): number {
  const base = (WEATHER_META[type] ?? WEATHER_META.NEUTRAL).marketMultiplier;
  const m = Math.max(0.25, Math.min(3, magnitude || 1));
  const scaled = 1 + (base - 1) * m; // NEUTRAL(base=1.0)は常に1.0
  return Math.round(Math.max(0.5, Math.min(2.0, scaled)) * 100) / 100;
}

// ─── 信用ランク(creditScore → 実特典) ────────────────────────────────
export interface CreditRankInfo { tier: number; label: string; marketDiscount: number; forecastDiscount: number }
export function creditRank(score: number): CreditRankInfo {
  if (score >= 90) return { tier: 4, label: "信用ランクS / PLATINUM", marketDiscount: 0.20, forecastDiscount: 0.50 };
  if (score >= 70) return { tier: 3, label: "信用ランクA / GOLD",     marketDiscount: 0.10, forecastDiscount: 0.25 };
  if (score >= 40) return { tier: 2, label: "信用ランクB / SILVER",   marketDiscount: 0.05, forecastDiscount: 0.00 };
  return            { tier: 1, label: "信用ランクC / BRONZE",         marketDiscount: 0.00, forecastDiscount: 0.00 };
}

// 経済予報(INTEL BROKER)の基本コスト(知性ポイント)
export const FORECAST_WISDOM_COST = 15;

export const QUIZ_SHIELD_DAYS = 7;
export const QUIZ_CORRECT_EXP = 50;
export const EN_MODE_EXP_MULTIPLIER = 1.5;
