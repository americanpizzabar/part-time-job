import Anthropic from "@anthropic-ai/sdk";

export interface NutritionResult {
  nutriStaple: number;   // 炭水化物スコア 0-3
  nutriProtein: number;  // タンパク質スコア 0-3
  nutriVeg: number;      // ビタミン/ミネラルスコア 0-3
  foodTitle: string;
  foodTitleEmoji: string;
}

// ---- キーワードフォールバック (APIキー未設定時) ----

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
  { title: "プロテイン・マキシマム", emoji: "💪", condition: (_s, p) => p >= 3 },
  { title: "カーボ・ブースター",    emoji: "⚡", condition: (s, p) => s >= 3 && p < 3 },
  { title: "ビタミン・タクティクス", emoji: "🥦", condition: (_s, p, v) => v >= 3 && p < 3 },
  { title: "バランス・マスター",    emoji: "🌟", condition: (s, p, v) => s >= 2 && p >= 2 && v >= 2 },
  { title: "ライト・オペレーション", emoji: "🥗", condition: (s, p, v) => s + p + v <= 3 },
  { title: "エナジー・コア",        emoji: "🍱", condition: () => true },
];

function pickTitle(staple: number, protein: number, veg: number): { foodTitle: string; foodTitleEmoji: string } {
  const candidate = TITLE_CANDIDATES.find(c => c.condition(staple, protein, veg))!;
  return { foodTitle: candidate.title, foodTitleEmoji: candidate.emoji };
}

function keywordAnalyze(memo: string | null): NutritionResult {
  const text = memo ?? "";
  const staple  = hitsToScore(countHits(text, STAPLE_WORDS));
  const protein = hitsToScore(countHits(text, PROTEIN_WORDS));
  const veg     = hitsToScore(countHits(text, VEG_WORDS));
  const noHints = staple === 0 && protein === 0 && veg === 0;
  const finalStaple  = noHints ? 2 : staple;
  const finalProtein = noHints ? 1 : protein;
  const finalVeg     = noHints ? 1 : veg;
  const { foodTitle, foodTitleEmoji } = pickTitle(finalStaple, finalProtein, finalVeg);
  return { nutriStaple: finalStaple, nutriProtein: finalProtein, nutriVeg: finalVeg, foodTitle, foodTitleEmoji };
}

// ---- Claude Vision 解析 ----

const VISION_PROMPT = `あなたは栄養士AIです。この食事の写真を見て、以下の3項目をそれぞれ0〜3のスコアで評価してください。

評価基準:
- 主食（炭水化物）: ご飯・パン・麺などがどれだけ含まれているか (0=なし, 1=少量, 2=適量, 3=豊富)
- 主菜（タンパク質）: 肉・魚・卵・豆腐などがどれだけ含まれているか (0=なし, 1=少量, 2=適量, 3=豊富)
- 副菜（ビタミン）: 野菜・サラダ・果物などがどれだけ含まれているか (0=なし, 1=少量, 2=適量, 3=豊富)

また、この食事にゲーム風の称号をつけてください。候補例:
- プロテイン・マキシマム 💪 (タンパク質豊富)
- カーボ・ブースター ⚡ (炭水化物メイン)
- ビタミン・タクティクス 🥦 (野菜たっぷり)
- バランス・マスター 🌟 (全体的にバランス良い)
- ライト・オペレーション 🥗 (軽め・ヘルシー)
- エナジー・コア 🍱 (一般的な昼食)
- または独自の称号も可

必ず以下のJSONのみを返してください（他のテキストは不要）:
{"staple":0,"protein":0,"veg":0,"title":"称号","emoji":"絵文字"}`;

function clamp03(v: unknown): number {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(3, Math.round(n)));
}

async function visionAnalyze(imageBase64: string, memo: string | null): Promise<NutritionResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Strip data URL prefix if present, keep raw base64
  const base64 = imageBase64.replace(/^data:image\/[^;]+;base64,/, "");
  // Detect media type from original string or default to jpeg
  const mediaTypeMatch = imageBase64.match(/^data:(image\/[^;]+);base64,/);
  const mediaType = (mediaTypeMatch?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  const userContent: Anthropic.MessageParam["content"] = [
    { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
    { type: "text", text: memo ? `${VISION_PROMPT}\n\n補足メモ: ${memo}` : VISION_PROMPT },
  ];

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 256,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("no text in response");

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("no JSON in response");

  const parsed = JSON.parse(jsonMatch[0]) as { staple?: unknown; protein?: unknown; veg?: unknown; title?: unknown; emoji?: unknown };
  const staple  = clamp03(parsed.staple);
  const protein = clamp03(parsed.protein);
  const veg     = clamp03(parsed.veg);
  const foodTitle = typeof parsed.title === "string" && parsed.title ? parsed.title : pickTitle(staple, protein, veg).foodTitle;
  const foodTitleEmoji = typeof parsed.emoji === "string" && parsed.emoji ? parsed.emoji : pickTitle(staple, protein, veg).foodTitleEmoji;

  return { nutriStaple: staple, nutriProtein: protein, nutriVeg: veg, foodTitle, foodTitleEmoji };
}

// ---- 公開エントリーポイント ----

export async function analyzeNutrition(
  imageBase64: string | null,
  memo: string | null
): Promise<NutritionResult> {
  if (imageBase64 && process.env.ANTHROPIC_API_KEY) {
    try {
      return await visionAnalyze(imageBase64, memo);
    } catch {
      // Vision失敗時はキーワード解析にフォールバック
    }
  }
  return keywordAnalyze(memo);
}
