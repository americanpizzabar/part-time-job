"use client";

import { formatJPY } from "@/lib/dateUtils";

interface BalanceCardProps {
  wallet: number;
  free: number;
  saved: number;
}

export default function BalanceCard({ wallet, free, saved }: BalanceCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
      <div className="text-sm opacity-80">財布の残高</div>
      <div className="text-3xl font-bold mt-1">{formatJPY(wallet)}</div>
      <div className="flex gap-4 mt-4 pt-4 border-t border-white/20">
        <div className="flex-1">
          <div className="text-xs opacity-80">自由に使えるお金</div>
          <div className="text-lg font-bold mt-0.5">{formatJPY(free)}</div>
        </div>
        <div className="flex-1">
          <div className="text-xs opacity-80">貯金中</div>
          <div className="text-lg font-bold mt-0.5">{formatJPY(saved)}</div>
        </div>
      </div>
    </div>
  );
}
