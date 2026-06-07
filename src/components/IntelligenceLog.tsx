"use client";

import { useState, useEffect, useMemo } from "react";

interface ArchiveItem {
  id: number | string;
  date: string;
  genre: string;
  genreLabel: string;
  layer: number;
  question: string;
  correctAnswer: string;
  explanation: string;
}

interface GenreCount {
  genre: string;
  label: string;
  count: number;
}

interface IntelligenceData {
  archive: ArchiveItem[];
  byGenre: GenreCount[];
  total: number;
}

const GENRE_COLOR: Record<string, string> = {
  CURRENT: "#38bdf8",
  ECONOMY: "#34d399",
  ENGLISH: "#a78bfa",
  LOGIC: "#fb923c",
};

const FALLBACK_COLOR = "#9ca3af";

const LAYER_LABEL: Record<number, string> = {
  1: "高校",
  2: "大学",
  3: "ビジネス",
};

function genreColor(genre: string): string {
  return GENRE_COLOR[genre] ?? FALLBACK_COLOR;
}

export default function IntelligenceLog() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("ALL");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/intelligence")
      .then(r => r.json())
      .then((d: IntelligenceData) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setData({ archive: [], byGenre: [], total: 0 });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const archive = data?.archive ?? [];
  const byGenre = data?.byGenre ?? [];

  const filtered = useMemo(
    () => (selected === "ALL" ? archive : archive.filter(a => a.genre === selected)),
    [archive, selected]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
        テスト前の復習に。一度ハッキング成功した知識のアーカイブ。
      </div>

      {/* ジャンルフィルター */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelected("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
            ${selected === "ALL"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
        >
          すべて（{data?.total ?? archive.length}）
        </button>
        {byGenre.map(g => {
          const color = genreColor(g.genre);
          const active = selected === g.genre;
          return (
            <button
              key={g.genre}
              onClick={() => setSelected(g.genre)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
              style={
                active
                  ? { backgroundColor: color, borderColor: color, color: "#fff" }
                  : { backgroundColor: color + "14", borderColor: color + "55", color }
              }
            >
              {g.label}（{g.count}）
            </button>
          );
        })}
      </div>

      {/* アーカイブ一覧 */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-gray-200">
          まだ正解したクイズがありません。
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const color = genreColor(item.genre);
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden"
              >
                <span
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: color }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ color, backgroundColor: color + "1a" }}
                  >
                    {item.genreLabel}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    Lv.{item.layer}・{LAYER_LABEL[item.layer] ?? "—"}
                  </span>
                  <span className="ml-auto text-[10px] text-gray-300">✓ ハッキング成功済み</span>
                </div>

                <div className="font-bold text-gray-800 mt-2 leading-snug">
                  {item.question}
                </div>

                <div className="mt-2 text-sm font-semibold text-emerald-600">
                  正解: {item.correctAnswer}
                </div>

                {item.explanation && (
                  <div className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                    {item.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
