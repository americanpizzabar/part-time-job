"use client";

import { useEffect, useState } from "react";
import { formatJPY } from "@/lib/dateUtils";

interface ChestStatus {
  weeklyBudget: number | null;
  spent: number;
  eligible: boolean;
  claimed: boolean;
  canClaim: boolean;
}

export default function ChestBanner({ onClaimed }: { onClaimed?: () => void }) {
  const [status, setStatus] = useState<ChestStatus | null>(null);
  const [reward, setReward] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const load = () => fetch("/api/optis/chest").then(r => r.json()).then(setStatus);
  useEffect(() => { load(); }, []);

  async function open() {
    setOpening(true);
    try {
      const res = await fetch("/api/optis/chest", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setReward(data.reward?.label ?? "報酬獲得！");
        onClaimed?.();
        load();
      }
    } finally {
      setOpening(false);
    }
  }

  if (!status || status.weeklyBudget == null) return null;
  if (!status.canClaim && !reward) return null;

  return (
    <div className="rounded-xl p-4 text-center" style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}>
      {reward ? (
        <>
          <div className="text-3xl mb-1">🎁✨</div>
          <div className="text-white font-bold">マイルストーン達成報酬</div>
          <div className="text-white text-lg font-bold mt-1">{reward}</div>
        </>
      ) : (
        <>
          <div className="text-3xl mb-1">🎁</div>
          <div className="text-white font-bold">今週の宝箱が出現！</div>
          <div className="text-orange-100 text-xs mt-0.5">
            週予算 {formatJPY(status.weeklyBudget)} 以内（支出 {formatJPY(status.spent)}）達成！
          </div>
          <button
            onClick={open}
            disabled={opening}
            className="mt-3 bg-white text-orange-600 font-bold px-6 py-2 rounded-full text-sm disabled:opacity-60"
          >
            {opening ? "開封中..." : "宝箱を開ける"}
          </button>
        </>
      )}
    </div>
  );
}
