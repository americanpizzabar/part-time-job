"use client";

import { formatJPY } from "@/lib/dateUtils";

interface MoneyFlowProps {
  transactions: { type: string; needsWants: string | null; amount: number }[];
}

export default function MoneyFlow({ transactions }: MoneyFlowProps) {
  const inflow = transactions
    .filter(t => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const needs = transactions
    .filter(t => t.type === "EXPENSE" && t.needsWants === "NEEDS")
    .reduce((s, t) => s + t.amount, 0);
  const wants = transactions
    .filter(t => t.type === "EXPENSE" && t.needsWants === "WANTS")
    .reduce((s, t) => s + t.amount, 0);
  const otherExpense = transactions
    .filter(t => t.type === "EXPENSE" && t.needsWants !== "NEEDS" && t.needsWants !== "WANTS")
    .reduce((s, t) => s + t.amount, 0);
  const spent = needs + wants + otherExpense;
  const saved = Math.max(0, inflow - spent);

  // Bar proportions are relative to the larger of inflow / total movement so the
  // bar always fills meaningfully.
  const denom = Math.max(inflow, spent, 1);
  const pct = (v: number) => `${(v / denom) * 100}%`;

  return (
    <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-950 to-slate-900 border border-cyan-500/30 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_20%_0%,#22d3ee33,transparent_60%)]" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🌊</span>
          <h3 className="text-cyan-300 font-bold text-sm tracking-wide">マネー・フロー</h3>
          <span className="text-[10px] text-cyan-500/60 ml-auto">今月のエネルギー循環</span>
        </div>

        {/* Inflow readout */}
        <div className="mb-3">
          <div className="text-[10px] text-emerald-300/80 mb-1">流入 INFLOW</div>
          <div className="text-2xl font-black text-emerald-300 drop-shadow-[0_0_8px_#34d399aa]">
            {formatJPY(inflow)}
          </div>
        </div>

        {/* Flow bar */}
        <div className="h-5 w-full rounded-full overflow-hidden flex bg-black/40 ring-1 ring-white/10">
          {needs > 0 && (
            <div
              className="h-full animate-pulse"
              style={{
                width: pct(needs),
                background: "linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa)",
                boxShadow: "0 0 12px #3b82f6cc inset",
              }}
              title={`NEEDS ${formatJPY(needs)}`}
            />
          )}
          {wants > 0 && (
            <div
              className="h-full animate-pulse"
              style={{
                width: pct(wants),
                background: "linear-gradient(90deg,#db2777,#ec4899,#f472b6)",
                boxShadow: "0 0 12px #ec4899cc inset",
                animationDelay: "0.3s",
              }}
              title={`WANTS ${formatJPY(wants)}`}
            />
          )}
          {otherExpense > 0 && (
            <div
              className="h-full"
              style={{ width: pct(otherExpense), background: "#475569" }}
              title={`その他 ${formatJPY(otherExpense)}`}
            />
          )}
          {saved > 0 && (
            <div
              className="h-full flex-1 animate-pulse"
              style={{
                background: "linear-gradient(90deg,#0e7490,#06b6d4,#22d3ee)",
                boxShadow: "0 0 12px #22d3eecc inset",
                animationDelay: "0.6s",
              }}
              title={`貯蓄 ${formatJPY(saved)}`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div>
            <div className="text-[10px] text-blue-300/80">🛡 NEEDS</div>
            <div className="text-sm font-bold text-blue-300 drop-shadow-[0_0_6px_#3b82f6aa]">{formatJPY(needs)}</div>
          </div>
          <div>
            <div className="text-[10px] text-pink-300/80">🎆 WANTS</div>
            <div className="text-sm font-bold text-pink-300 drop-shadow-[0_0_6px_#ec4899aa]">{formatJPY(wants)}</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-300/80">💧 貯蓄</div>
            <div className="text-sm font-bold text-cyan-300 drop-shadow-[0_0_6px_#22d3eeaa]">{formatJPY(saved)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
