"use client";

import { today } from "@/lib/dateUtils";

// 「ジャストタイム・コンボ」= 連続して支出入力した日数を端末ローカルで管理する。
// 毎日サクッと記録する習慣づけのためのゲーミフィケーション。サーバー変更は不要。

const KEY = "optis_input_combo";

export interface ComboState {
  count: number; // 連続入力日数
  lastDate: string; // 最後に入力した日(YYYY-MM-DD)
}

function read(): ComboState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ComboState;
    if (typeof parsed.count !== "number" || typeof parsed.lastDate !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

// YYYY-MM-DD の差分日数(b - a)
function dayDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

// 現在のコンボ状態を返す(更新はしない)。連続が途切れていれば 0 とみなす。
export function currentCombo(): number {
  const st = read();
  if (!st) return 0;
  const d = dayDiff(st.lastDate, today());
  if (d === 0 || d === 1) return st.count;
  return 0; // 2日以上空いたら途切れている
}

// 入力時に呼ぶ。コンボを更新して結果を返す。
// - 同日2回目以降: カウント据え置き(streakExtended=false)
// - 前日に入力済み: +1(streakExtended=true)
// - それ以前 or 初回: 1にリセット
export function bumpCombo(): { count: number; streakExtended: boolean } {
  const t = today();
  const st = read();
  let count: number;
  let streakExtended: boolean;
  if (!st) {
    count = 1;
    streakExtended = true;
  } else {
    const d = dayDiff(st.lastDate, t);
    if (d === 0) {
      count = st.count;
      streakExtended = false;
    } else if (d === 1) {
      count = st.count + 1;
      streakExtended = true;
    } else {
      count = 1;
      streakExtended = true;
    }
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ count, lastDate: t } satisfies ComboState));
  } catch {
    /* no-op */
  }
  return { count, streakExtended };
}
