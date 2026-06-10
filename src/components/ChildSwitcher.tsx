"use client";

import { useState, useEffect, useCallback } from "react";

interface ChildProfile { id: string; name: string; avatar: string; color: string }

// 親画面の「コックピット型」子供切り替えタブ。
// タップで表示中の子(アクティブ子プロファイル)を切り替え、onSwitch で
// 親画面のデータを再取得させる。子が1人なら何も表示しない。
export default function ChildSwitcher({ onSwitch }: { onSwitch: () => void }) {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        fetch("/api/family/child").then(r => r.json()),
        fetch("/api/family/active-child").then(r => r.json()),
      ]);
      setChildren(Array.isArray(c?.children) ? c.children : []);
      setActiveId(a?.activeChildId ?? null);
    } catch { /* 未ペアリングなどは無視 */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function switchTo(id: string) {
    if (id === activeId || switching) return;
    setSwitching(true);
    setActiveId(id); // 楽観的に即反映
    try {
      const r = await fetch("/api/family/active-child", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: id }),
      });
      if (r.ok) onSwitch();
      else await load();
    } finally { setSwitching(false); }
  }

  if (children.length <= 1) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-2">
      <div className="text-[10px] font-bold text-gray-400 px-2 pt-1 pb-1.5">表示中のお子さん</div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {children.map(c => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              onClick={() => switchTo(c.id)}
              disabled={switching}
              className={`flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-2 text-sm font-bold border-2 transition-all
                ${active ? "text-white" : "bg-gray-50 text-gray-500 border-transparent"}`}
              style={active ? { backgroundColor: c.color, borderColor: c.color } : undefined}
            >
              <span className="text-lg">{c.avatar}</span>
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
