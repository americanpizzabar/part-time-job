"use client";

import { useEffect, useState } from "react";
import { formatJPY } from "@/lib/dateUtils";
import { PARTS, RARITY_META, Part } from "@/lib/optis";

interface DarkWebPanelProps {
  optis: { level: number; intoLevel: number; needed: number; experience: number; creditScore: number };
  onExit: () => void;
  onChanged: () => void;
}

interface FullState {
  equippedAura: string;
  equippedAccessory: string | null;
  equippedBody: string;
  unlocked: string[];
  archive: { resistedTotal: number; items: { id: number; amount: number; date: string; memo: string | null }[] };
}

export default function DarkWebPanel({ optis, onExit, onChanged }: DarkWebPanelProps) {
  const [state, setState] = useState<FullState | null>(null);

  const load = () => fetch("/api/optis").then(r => r.json()).then(setState);
  useEffect(() => { load(); }, []);

  async function equip(part: Part) {
    await fetch("/api/optis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partId: part.id, type: part.type }),
    });
    await load();
    onChanged();
  }

  const expRemain = optis.needed - optis.intoLevel;

  return (
    <div className="fixed inset-0 z-[70] dark-web dark-web-grid overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold neon-flicker tracking-widest" style={{ textShadow: "0 0 8px #22d3ee" }}>
            ◢ DARK WEB MODE ◣
          </h1>
          <button onClick={onExit} className="text-cyan-300 border border-cyan-500/50 rounded-lg px-3 py-1 text-xs">
            EXIT ▸
          </button>
        </div>

        {/* ステータスハッキング */}
        <div className="border border-cyan-500/40 rounded-xl p-4 mb-4 bg-black/40">
          <div className="text-[11px] text-cyan-500 tracking-widest mb-2">// STATUS_HACK</div>
          <div className="grid grid-cols-2 gap-3 font-mono text-sm">
            <div>
              <div className="text-cyan-600 text-[10px]">LEVEL</div>
              <div className="text-cyan-200 text-lg">{optis.level}</div>
            </div>
            <div>
              <div className="text-cyan-600 text-[10px]">CREDIT_SCORE</div>
              <div className="text-cyan-200 text-lg">{optis.creditScore}/100</div>
            </div>
            <div>
              <div className="text-cyan-600 text-[10px]">TOTAL_EXP</div>
              <div className="text-cyan-200 text-lg">{optis.experience}</div>
            </div>
            <div>
              <div className="text-cyan-600 text-[10px]">EXP_TO_NEXT</div>
              <div className="text-fuchsia-300 text-lg">{expRemain}</div>
            </div>
          </div>
        </div>

        {/* 物欲アーカイブ */}
        <div className="border border-fuchsia-500/40 rounded-xl p-4 mb-4 bg-black/40">
          <div className="text-[11px] text-fuchsia-400 tracking-widest mb-2">// 物欲アーカイブ — 我慢して貯めた総額</div>
          <div className="text-3xl font-bold text-fuchsia-300 mb-3" style={{ textShadow: "0 0 10px #e879f9" }}>
            {state ? formatJPY(state.archive.resistedTotal) : "..."}
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-xs">
            {state?.archive.items.length === 0 && <div className="text-fuchsia-700">まだ記録がありません</div>}
            {state?.archive.items.map(it => (
              <div key={it.id} className="flex justify-between text-fuchsia-200/80 border-b border-fuchsia-900/40 py-1">
                <span>{it.date} {it.memo ?? "貯金"}</span>
                <span>+{formatJPY(it.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* パーツ・クローゼット(装備) */}
        <div className="border border-cyan-500/40 rounded-xl p-4 bg-black/40">
          <div className="text-[11px] text-cyan-500 tracking-widest mb-3">// CUSTOMIZE — 所持パーツを装備</div>
          <div className="grid grid-cols-3 gap-2">
            {PARTS.map(part => {
              const owned = state?.unlocked.includes(part.id);
              const equipped =
                state?.equippedAura === part.id ||
                state?.equippedAccessory === part.id ||
                state?.equippedBody === part.id;
              return (
                <button
                  key={part.id}
                  disabled={!owned}
                  onClick={() => owned && equip(part)}
                  className={`rounded-lg p-2 text-center border text-xs transition-all
                    ${equipped ? "border-cyan-300 bg-cyan-500/20" : owned ? "border-cyan-800 bg-black/40" : "border-gray-800 opacity-30"}`}
                >
                  <div className="text-xl mb-0.5">{part.emoji ?? (part.type === "aura" ? "◎" : "▣")}</div>
                  <div className="text-cyan-200 leading-tight">{part.name}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: RARITY_META[part.rarity].color }}>
                    {owned ? RARITY_META[part.rarity].label : "未所持"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
