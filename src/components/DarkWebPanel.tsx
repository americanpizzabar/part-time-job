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
}

interface SimData {
  windowDays: number;
  grandTotal: number;
  weeklySpend: number;
  weeklyBudget: number;
  categories: {
    name: string;
    total: number;
    perWeekAmount: number;
    perWeekCount: number;
    avgPerOccurrence: number;
  }[];
  project: {
    id: number;
    name: string;
    plannedAmount: number;
    targetAmount: number;
    total: number;
    remaining: number;
    selfSaved: number;
    selfTarget: number;
    progressPct: number;
  } | null;
}

type Tab = "matrix" | "closet" | "status";

export default function DarkWebPanel({ optis, onExit, onChanged }: DarkWebPanelProps) {
  const [state, setState] = useState<FullState | null>(null);
  const [sim, setSim] = useState<SimData | null>(null);
  const [tab, setTab] = useState<Tab>("matrix");

  const load = () => {
    fetch("/api/optis").then(r => r.json()).then(setState);
    fetch("/api/simulator").then(r => r.json()).then(setSim);
  };
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

  // ── シミュレーター計算 ──────────────────────────────────────────────────
  function computeSavings(reduceCategory: string, reduceCount: number): string {
    if (!sim) return "…";
    const cat = sim.categories.find(c => c.name === reduceCategory);
    if (!cat) return "変化なし";
    const savings = Math.round(cat.avgPerOccurrence * reduceCount);
    return formatJPY(savings);
  }

  function daysToGoal(extraPerWeek: number): string {
    if (!sim?.project) return "—";
    const { remaining, plannedAmount } = sim.project;
    if (remaining <= 0) return "達成済み！";
    const weeksBase = Math.ceil(remaining / Math.max(1, plannedAmount));
    if (extraPerWeek <= 0) return `あと約 ${weeksBase} 週`;
    const weeksNew = Math.ceil(remaining / Math.max(1, plannedAmount + extraPerWeek));
    const saved = weeksBase - weeksNew;
    if (saved <= 0) return `あと約 ${weeksBase} 週`;
    return `あと約 ${weeksNew} 週 (${saved} 週短縮！)`;
  }

  const topCats = sim?.categories.slice(0, 4) ?? [];

  return (
    <div className="fixed inset-0 z-[70] dark-web dark-web-grid overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold neon-flicker tracking-widest" style={{ textShadow: "0 0 8px #22d3ee" }}>
            ◢ DARK WEB MODE ◣
          </h1>
          <button onClick={onExit} className="text-cyan-300 border border-cyan-500/50 rounded-lg px-3 py-1 text-xs">
            EXIT ▸
          </button>
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-5">
          {([["matrix", "// MATRIX"], ["closet", "// CUSTOMIZE"], ["status", "// STATUS"]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-[11px] rounded-lg font-mono border transition-colors ${
                tab === t
                  ? "bg-cyan-900/60 border-cyan-400 text-cyan-200"
                  : "border-cyan-800/40 text-cyan-700 hover:text-cyan-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── バジェット・マトリクス(シミュレーター) ──────────────────── */}
        {tab === "matrix" && (
          <div className="space-y-4">
            <div className="border border-cyan-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-cyan-500 tracking-widest mb-3">// BUDGET_MATRIX — 過去30日の支出傾向</div>
              {!sim ? (
                <div className="text-cyan-600 text-xs font-mono">LOADING DATA…</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 font-mono text-sm mb-4">
                    <div>
                      <div className="text-cyan-600 text-[10px]">WEEKLY_SPEND</div>
                      <div className="text-cyan-200">{formatJPY(sim.weeklySpend)}</div>
                    </div>
                    <div>
                      <div className="text-cyan-600 text-[10px]">BUDGET</div>
                      <div className={sim.weeklyBudget ? "text-emerald-300" : "text-cyan-700"}>
                        {sim.weeklyBudget ? formatJPY(sim.weeklyBudget) : "未設定"}
                      </div>
                    </div>
                    <div>
                      <div className="text-cyan-600 text-[10px]">SURPLUS</div>
                      <div className={sim.weeklyBudget && sim.weeklyBudget > sim.weeklySpend ? "text-emerald-400" : "text-red-400"}>
                        {sim.weeklyBudget
                          ? formatJPY(sim.weeklyBudget - sim.weeklySpend)
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {/* カテゴリ別週平均 */}
                  {topCats.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <div className="text-[10px] text-cyan-600 tracking-widest">TOP CATEGORIES / WEEK</div>
                      {topCats.map(cat => {
                        const maxAmt = topCats[0].perWeekAmount || 1;
                        const pct = Math.round((cat.perWeekAmount / maxAmt) * 100);
                        return (
                          <div key={cat.name} className="font-mono">
                            <div className="flex justify-between text-xs text-cyan-300">
                              <span>{cat.name}</span>
                              <span>{formatJPY(cat.perWeekAmount)}/週 ({cat.perWeekCount}回)</span>
                            </div>
                            <div className="h-1.5 bg-cyan-900/40 rounded mt-0.5">
                              <div className="h-full rounded bg-cyan-400" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* プロジェクト攻略シミュレーター */}
            {sim?.project && (
              <div className="border border-fuchsia-500/40 rounded-xl p-4 bg-black/40">
                <div className="text-[11px] text-fuchsia-400 tracking-widest mb-3">// PROJECT_HACK — 「{sim.project.name}」攻略ルート</div>
                <div className="font-mono text-xs text-fuchsia-200 mb-4">
                  残り {formatJPY(sim.project.remaining)} ({sim.project.progressPct}% 達成)
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] text-fuchsia-600 tracking-widest">SCENARIO_ANALYSIS:</div>
                  {topCats.filter(c => c.perWeekAmount > 0).map(cat => {
                    const cutOnce = cat.avgPerOccurrence;
                    const extraWeek = Math.round(cutOnce * 0.5);
                    return (
                      <div key={cat.name} className="bg-black/30 border border-fuchsia-900/40 rounded-lg p-3">
                        <div className="text-fuchsia-300 text-xs font-mono mb-1">
                          📍 「{cat.name}」を週1回減らすと:
                        </div>
                        <div className="text-emerald-300 text-xs font-mono">
                          → 週 +{computeSavings(cat.name, 1)} 節約
                          → 目標達成: {daysToGoal(cutOnce)}
                        </div>
                      </div>
                    );
                  })}
                  {topCats.length === 0 && (
                    <div className="text-fuchsia-700 text-xs font-mono">支出データが少なすぎます。もっと記録してください。</div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-fuchsia-900/40 text-[10px] text-fuchsia-700 font-mono">
                  * 過去30日の平均から計算。実際の結果は変わる場合があります。
                </div>
              </div>
            )}

            {sim && !sim.project && (
              <div className="border border-fuchsia-500/20 rounded-xl p-4 bg-black/40 text-center">
                <div className="text-fuchsia-700 text-xs font-mono">進行中のプロジェクトがありません。<br/>マイ・プロジェクトから登録してください。</div>
              </div>
            )}
          </div>
        )}

        {/* ── パーツ・クローゼット ────────────────────────────────────── */}
        {tab === "closet" && (
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
        )}

        {/* ── ステータス ──────────────────────────────────────────────── */}
        {tab === "status" && (
          <div className="border border-cyan-500/40 rounded-xl p-4 bg-black/40">
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
        )}
      </div>
    </div>
  );
}
