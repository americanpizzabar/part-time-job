"use client";

import { useState, useEffect } from "react";

// 簡易UIモード(お手伝い+お年玉のみ)のクライアント配信フック。
// 真のソースはサーバー(AggregationConfig.simpleUi)。localStorage は
// 初期描画のちらつき防止用キャッシュで、マウント時に /api/config と同期する。
const KEY = "app-simple-ui";
const EVENT = "simplemodechange";

export function getStoredSimpleMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function setStoredSimpleMode(on: boolean) {
  localStorage.setItem(KEY, on ? "1" : "0");
  window.dispatchEvent(new Event(EVENT));
}

export function useSimpleMode(): { simple: boolean; mounted: boolean } {
  const [simple, setSimple] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSimple(getStoredSimpleMode());
    setMounted(true);

    // サーバー設定と同期(親が別端末で切り替えた場合もここで追従)
    fetch("/api/config")
      .then(r => r.json())
      .then(cfg => {
        const on = !!cfg.aggregation?.simpleUi;
        if (on !== getStoredSimpleMode()) setStoredSimpleMode(on);
        setSimple(on);
      })
      .catch(() => {});

    const handler = () => setSimple(getStoredSimpleMode());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return { simple, mounted };
}
