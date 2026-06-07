"use client";

import { useState } from "react";
import ChronicleTimeline from "@/components/ChronicleTimeline";
import IntelligenceLog from "@/components/IntelligenceLog";

type Tab = "chronicle" | "intelligence";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "chronicle", label: "進化の系譜", icon: "🏛️" },
  { key: "intelligence", label: "知の保存庫", icon: "🧠" },
];

export default function ChroniclePage() {
  const [tab, setTab] = useState<Tab>("chronicle");

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">メモリー・タイムカプセル</h1>
        <p className="text-xs text-gray-500 mt-1">
          {tab === "chronicle"
            ? "オプティス・クロニクル — 進化の系譜ビューア"
            : "インテリジェンス・ログ — 知の保存庫"}
        </p>
      </div>

      {/* タブ切り替え */}
      <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 gap-0.5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all
              ${tab === t.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "chronicle" ? <ChronicleTimeline /> : <IntelligenceLog />}
    </div>
  );
}
