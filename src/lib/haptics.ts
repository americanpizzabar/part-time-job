"use client";

// 端末のハプティック(振動)ラッパー。非対応端末/SSRでは安全に無視される。
// iOS Safari は navigator.vibrate 非対応のため、呼び出しても何も起きない(エラーにはならない)。

function buzz(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(pattern);
  } catch {
    /* no-op */
  }
}

// ダイアルを刻むときの極小フィードバック
export const hapticTick = () => buzz(4);
// ボタンタップ
export const hapticTap = () => buzz(10);
// 重い金額 / 確定時のずっしり感
export const hapticHeavy = () => buzz(45);
// 成功(仕分け確定・コンボ)
export const hapticSuccess = () => buzz([14, 28, 22]);
// コンボ加速時の派手な連打
export const hapticCombo = (level: number) =>
  buzz(Array.from({ length: Math.min(level, 5) }, () => 10).flatMap(v => [v, 24]));
