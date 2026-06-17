export const EXPENSE_CATEGORIES = [
  "友達と遊ぶ",
  "文房具",
  "買い食い",
  "昼食",
  "趣味",
  "その他",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_ICONS: Record<string, string> = {
  友達と遊ぶ: "🎮",
  文房具: "✏️",
  買い食い: "🍩",
  昼食: "🍱",
  趣味: "🎨",
  その他: "📦",
};

export const NEEDS = "NEEDS";
export const WANTS = "WANTS";

// 「定番ショートカット」: よく使う支出をワンタップで金額+カテゴリ確定するためのプリセット。
// QuickAddModal の金額ステップ上部に浮遊チップとして表示する。
export interface QuickPreset {
  label: string;
  amount: number;
  category: ExpenseCategory;
  emoji: string;
}

export const QUICK_PRESETS: QuickPreset[] = [
  { label: "コンビニ", amount: 300, category: "買い食い", emoji: "🏪" },
  { label: "自販機", amount: 160, category: "買い食い", emoji: "🥤" },
  { label: "昼食", amount: 500, category: "昼食", emoji: "🍱" },
  { label: "文房具", amount: 200, category: "文房具", emoji: "✏️" },
  { label: "おやつ", amount: 150, category: "買い食い", emoji: "🍩" },
];

export const PRESENTATION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  HOLD: "HOLD",
} as const;

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "申請中",
  APPROVED: "承認",
  REJECTED: "却下",
  HOLD: "保留・要相談",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  HOLD: "bg-yellow-100 text-yellow-700",
};

export function needsWantsFeedback(needsRatio: number, wantsRatio: number, total: number): string {
  if (total === 0) return "今月はまだ支出がありません。";
  if (wantsRatio >= 70) {
    return `今月は「欲しい(Wants)」への出費が${wantsRatio}%でした。少し使いすぎたかも？次は計画的に使ってみよう。`;
  }
  if (wantsRatio >= 50) {
    return `「欲しい(Wants)」が${wantsRatio}%。バランスは悪くないけど、貯金も意識してみよう。`;
  }
  if (needsRatio >= 70) {
    return `今月は「必要(Needs)」が${needsRatio}%。とても計画的にお金を使えています！`;
  }
  return `Needs ${needsRatio}% / Wants ${wantsRatio}%。良いバランスで使えています。`;
}
