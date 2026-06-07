"use client";

import { useState, useEffect } from "react";

type Kind = "REBIRTH" | "MISSION" | "PROJECT" | "BIG_BUY" | "PRESENTATION";

interface TimelineEntry {
  kind: Kind;
  date: string;
  title: string;
  detail: string;
  icon: string;
}

interface ChronicleStats {
  generations: number;
  cubes: number;
  missionsCleared: number;
  projectsCompleted: number;
}

interface ChronicleData {
  timeline: TimelineEntry[];
  stats: ChronicleStats;
}

const KIND_COLOR: Record<Kind, string> = {
  REBIRTH: "#d946ef", // fuchsia
  MISSION: "#f59e0b", // amber
  PROJECT: "#10b981", // emerald
  BIG_BUY: "#3b82f6", // blue
  PRESENTATION: "#8b5cf6", // violet
};

const KIND_LABEL: Record<Kind, string> = {
  REBIRTH: "進化",
  MISSION: "ミッション",
  PROJECT: "プロジェクト",
  BIG_BUY: "大きな買い物",
  PRESENTATION: "プレゼン",
};

/** Accepts ISO string or "YYYY-MM-DD" → "YYYY年M月D日" */
function formatJDate(input: string): string {
  if (!input) return "";
  const datePart = input.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (m) {
    return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
  }
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function getYear(input: string): string {
  const datePart = (input || "").slice(0, 10);
  const m = /^(\d{4})/.exec(datePart);
  if (m) return m[1];
  const d = new Date(input);
  return isNaN(d.getTime()) ? "" : String(d.getFullYear());
}

const STAT_TILES: { key: keyof ChronicleStats; label: string; icon: string }[] = [
  { key: "generations", label: "世代", icon: "🧬" },
  { key: "cubes", label: "キューブ", icon: "🧊" },
  { key: "missionsCleared", label: "クリア", icon: "🎯" },
  { key: "projectsCompleted", label: "達成", icon: "🏆" },
];

export default function ChronicleTimeline() {
  const [data, setData] = useState<ChronicleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/chronicle")
      .then(r => r.json())
      .then((d: ChronicleData) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setData({ timeline: [], stats: { generations: 0, cubes: 0, missionsCleared: 0, projectsCompleted: 0 } });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const timeline = data?.timeline ?? [];
  const stats = data?.stats ?? { generations: 0, cubes: 0, missionsCleared: 0, projectsCompleted: 0 };

  return (
    <div className="space-y-4">
      {/* 統計ストリップ */}
      <div className="grid grid-cols-4 gap-2">
        {STAT_TILES.map(t => (
          <div
            key={t.key}
            className="bg-white rounded-xl border border-gray-200 p-2.5 text-center"
          >
            <div className="text-lg leading-none">{t.icon}</div>
            <div className="text-xl font-bold text-gray-800 mt-1 tabular-nums">
              {stats[t.key]}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">{t.label}</div>
          </div>
        ))}
      </div>

      {timeline.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-gray-200">
          まだ記録がありません。Optisを育てていこう！
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="relative">
            {/* 縦ライン */}
            <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent" />

            <ul className="space-y-5">
              {timeline.map((entry, i) => {
                const color = KIND_COLOR[entry.kind] ?? "#9ca3af";
                const prevYear = i > 0 ? getYear(timeline[i - 1].date) : null;
                const year = getYear(entry.date);
                const showYear = year !== "" && year !== prevYear;
                return (
                  <li key={i}>
                    {showYear && (
                      <div className="flex items-center gap-2 mb-3 ml-9">
                        <span className="text-xs font-bold text-gray-400 tracking-widest">
                          {year}
                        </span>
                        <span className="flex-1 h-px bg-gray-100" />
                      </div>
                    )}
                    <div className="relative flex gap-4">
                      {/* ノード */}
                      <div className="relative z-10 flex-shrink-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-base shadow-sm ring-4 ring-white"
                          style={{ backgroundColor: color + "22", border: `2px solid ${color}` }}
                        >
                          {entry.icon}
                        </div>
                      </div>
                      {/* 内容 */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400">{formatJDate(entry.date)}</span>
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ color, backgroundColor: color + "1a" }}
                          >
                            {KIND_LABEL[entry.kind] ?? entry.kind}
                          </span>
                        </div>
                        <div className="font-bold text-gray-800 mt-0.5">{entry.title}</div>
                        {entry.detail && (
                          <div className="text-sm text-gray-500 mt-0.5">{entry.detail}</div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
