import { QUICK_PRESETS, CATEGORY_ICONS } from "@/lib/budget";

const KEY = "optis_preset_counts";
const MAX_CHIPS = 6;

function readCounts(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}

export function recordUsage(amount: number, category: string): void {
  const counts = readCounts();
  const k = `${amount}_${category}`;
  counts[k] = (counts[k] ?? 0) + 1;
  localStorage.setItem(KEY, JSON.stringify(counts));
}

export interface DynamicPreset {
  label: string;
  amount: number;
  category: string;
  emoji: string;
}

export function getRankedPresets(): DynamicPreset[] {
  const counts = readCounts();
  if (Object.keys(counts).length === 0) {
    return QUICK_PRESETS.map(p => ({ label: p.label, amount: p.amount, category: p.category, emoji: p.emoji }));
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_CHIPS)
    .map(([key]) => {
      const sep = key.indexOf("_");
      const amount = Number(key.slice(0, sep));
      const category = key.slice(sep + 1);
      const match = QUICK_PRESETS.find(p => p.amount === amount && p.category === category);
      return {
        label: match?.label ?? category,
        amount,
        category,
        emoji: match?.emoji ?? (CATEGORY_ICONS[category] ?? "💰"),
      };
    });
}
