"use client";

import { useEffect, useState, useCallback } from "react";
import { formatJPY } from "@/lib/dateUtils";
import { getPart } from "@/lib/optis";

interface Mission {
  id: number;
  title: string;
  description: string | null;
  rewardType: string;
  rewardCash: number | null;
  rewardPart: string | null;
  status: string;
}

function rewardLabel(m: Mission): string {
  if (m.rewardType === "CASH") return `報酬 ${formatJPY(m.rewardCash ?? 0)}`;
  const p = getPart(m.rewardPart);
  return `報酬 ${p ? `${p.emoji ?? "✨"} ${p.name}` : "レアパーツ"}`;
}

export default function MissionInbox({ onChanged }: { onChanged?: () => void }) {
  const [missions, setMissions] = useState<Mission[]>([]);

  const load = useCallback(async () => {
    const data = await fetch("/api/missions").then(r => r.json());
    setMissions(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function clear(id: number) {
    await fetch(`/api/missions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CLEAR" }),
    });
    await load();
    onChanged?.();
  }

  const active = missions.filter(m => m.status === "SENT" || m.status === "CLEARED");
  if (active.length === 0) return null;

  return (
    <div className="space-y-2">
      {active.map(m => (
        <div
          key={m.id}
          className="rounded-xl p-3 border-2 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#0f172a,#1e1b4b)",
            borderColor: m.status === "SENT" ? "#22d3ee" : "#64748b",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] tracking-widest text-cyan-400 neon-flicker">
                {m.status === "SENT" ? "⚡ 緊急電文・ミッション発生" : "⏳ 承認待ち"}
              </div>
              <div className="font-bold text-white mt-0.5">{m.title}</div>
              {m.description && <div className="text-xs text-gray-300 mt-0.5">{m.description}</div>}
              <div className="text-xs text-yellow-300 mt-1">{rewardLabel(m)}</div>
            </div>
            {m.status === "SENT" ? (
              <button
                onClick={() => clear(m.id)}
                className="flex-shrink-0 bg-cyan-500 text-slate-900 font-bold text-xs px-3 py-2 rounded-lg"
              >
                クリア報告
              </button>
            ) : (
              <span className="flex-shrink-0 text-xs text-gray-400">親の承認待ち</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
