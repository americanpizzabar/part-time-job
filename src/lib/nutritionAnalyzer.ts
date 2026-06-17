// 栄養解析エンジン: 写真のbase64 + メモ文字列から
//   { staple, protein, veg } (0..3) と食事称号を返す。
//
// デフォルト実装: メモ中のキーワードで推定する疑似解析。
// AI連携を後から追加する場合はここの `analyzeNutrition` だけ差し替えればよい。

export interface NutritionResult {
  nutriStaple: number;   // 炭水化物スコア 0-3
  nutriProtein: number;  // タンパク質スコア 0-3
  nutriVeg: number;      // ビタミン/ミネラルスコア 0-3
  foodTitle: string;
  foodTitleEmoji: string;
}

// キーワード→スコアマッピング
const STAPLE_WORDS = ["ご飯", "ごはん", "米", "パン", "麺", "うどん", "ラーメン", "パスタ", "丼", "おにぎり", "炭水化物", "そば", "チャーハン", "焼きそば", "食パン", "ピザ"];
const PROTEIN_WORDS = ["肉", "魚", "卵", "チキン", "豚", "牛", "鶏", "サーモン", "マグロ", "ツナ", "納豆", "豆腐", "えび", "たまご", "ハム", "焼き魚", "唐揚げ", "から揚げ", "タンパク", "protein"];
const VEG_WORDS = ["野菜", "サラダ", "ほうれん草", "トマト", "キャベツ", "ブロッコリー", "にんじん", "緑", "副菜", "フルーツ", "果物", "みかん", "レタス", "きゅうり", "ビタミン"];

function countHits(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.filter(w => lower.includes(w)).length;
}

function hitsToScore(hits: number): number {
  if (hits === 0) return 0;
  if (hits === 1) return 1;
  if (hits === 2) return 2;
  return 3;
}

interface TitleCandidate { title: string; emoji: string; condition: (s: number, p: number, v: number) => boolean }
const TITLE_CANDIDATES: TitleCandidate[] = [
  { title: "プロテイン・マキシマム", emoji: "💪", condition: (s, p, v) => p >= 3 },
  { title: "カーボ・ブースター",    emoji: "⚡", condition: (s, p, v) => s >= 3 && p < 3 },
  { title: "ビタミン・タクティクス", emoji: "🥦", condition: (s, p, v) => v >= 3 && p < 3 },
  { title: "バランス・マスター",    emoji: "🌟", condition: (s, p, v) => s >= 2 && p >= 2 && v >= 2 },
  { title: "ライト・オペレーション", emoji: "🥗", condition: (s, p, v) => s + p + v <= 3 },
  { title: "エナジー・コア",        emoji: "🍱", condition: () => true }, // デフォルト
];

function pickTitle(staple: number, protein: number, veg: number): { foodTitle: string; foodTitleEmoji: string } {
  const candidate = TITLE_CANDIDATES.find(c => c.condition(staple, protein, veg))!;
  return { foodTitle: candidate.title, foodTitleEmoji: candidate.emoji };
}

// メモ文字列のみで推定する疑似解析(サーバー側で使用)。
// AIなしでも全機能が動く。将来Claude Vision等に差し替え可能。
export async function analyzeNutrition(
  _imageBase64: string | null,
  memo: string | null
): Promise<NutritionResult> {
  const text = memo ?? "";
  const staple  = hitsToScore(countHits(text, STAPLE_WORDS));
  const protein = hitsToScore(countHits(text, PROTEIN_WORDS));
  const veg     = hitsToScore(countHits(text, VEG_WORDS));
  // キーワードが全くなければ、昼食の平均的な栄養バランスを仮定する
  const finalStaple  = staple === 0 && protein === 0 && veg === 0 ? 2 : staple;
  const finalProtein = staple === 0 && protein === 0 && veg === 0 ? 1 : protein;
  const finalVeg     = staple === 0 && protein === 0 && veg === 0 ? 1 : veg;
  const { foodTitle, foodTitleEmoji } = pickTitle(finalStaple, finalProtein, finalVeg);
  return { nutriStaple: finalStaple, nutriProtein: finalProtein, nutriVeg: finalVeg, foodTitle, foodTitleEmoji };
}
