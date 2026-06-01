"use client";

import { useEffect, useState, useCallback } from "react";
import { formatJPY } from "@/lib/dateUtils";
import { PARTS, getPart } from "@/lib/optis";

interface Mission {
  id: number;
  title: string;
  description: string | null;
  rewardType: string;
  rewardCash: number | null;
  rewardPart: string | null;
  status: string;
}

const STATUS_JA: Record<string, string> = {
  SENT: "送信済(挑戦中)",
  CLEARED: "クリア報告あり",
  APPROVED: "承認・報酬付与済",
  REJECTED: "却下",
};
const STATUS_COLOR: Record<string, string> = {
  SENT: "bg-cyan-100 text-cyan-700",
  CLEARED: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-gray-100 text-gray-500",
};

const REWARD_PARTS = PARTS.filter(p => p.id !== "body_core" && p.id !== "aura_basic");

export default function MissionManager() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardType, setRewardType] = useState<"CASH" | "PART">("CASH");
  const [rewardCash, setRewardCash] = useState("");
  const [rewardPart, setRewardPart] = useState(REWARD_PARTS[0].id);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setMissions(await fetch("/api/missions").then(r => r.json()));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!title) return;
    setSaving(true);
    try {
      await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          rewardType,
          rewardCash: rewardType === "CASH" ? Number(rewardCash || 0) : undefined,
          rewardPart: rewardType === "PART" ? rewardPart : undefined,
        }),
      });
      setTitle(""); setDescription(""); setRewardCash(""); setShow(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function act(id: number, action: string) {
    await fetch(`/api/missions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  }
  async function del(id: number) {
    if (!confirm("このミッションを削除しますか？")) return;
    await fetch(`/api/missions/${id}`, { method: "DELETE" });
    load();
  }

  function rewardText(m: Mission) {
    if (m.rewardType === "CASH") return formatJPY(m.rewardCash ?? 0);
    const p = getPart(m.rewardPart);
    return p ? `${p.emoji ?? "✨"} ${p.name}` : "パーツ";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-gray-800">シークレット・ミッション</h2>
        <button onClick={() => setShow(true)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium">
          + 新規
        </button>
      </div>

      {missions.length === 0 ? (
        <div className="text-center text-gray-400 py-6 bg-white rounded-xl border border-gray-200 text-sm">
          ミッションはありません
        </div>
      ) : (
        <div className="space-y-2">
          {missions.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-gray-800">{m.title}</div>
                  {m.description && <div className="text-xs text-gray-500 mt-0.5">{m.description}</div>}
                  <div className="text-xs text-blue-600 mt-1">報酬: {rewardText(m)}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[m.status]}`}>
                  {STATUS_JA[m.status]}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                {m.status === "CLEARED" && (
                  <>
                    <button onClick={() => act(m.id, "APPROVE")} className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium">
                      承認して報酬を渡す
                    </button>
                    <button onClick={() => act(m.id, "REJECT")} className="px-3 bg-gray-100 text-gray-600 py-1.5 rounded-lg text-xs">
                      却下
                    </button>
                  </>
                )}
                {m.status !== "CLEARED" && (
                  <button onClick={() => del(m.id)} className="text-xs text-gray-400 hover:text-red-500">削除</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {show && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">ミッションを送信</h3>
              <button onClick={() => setShow(false)} className="text-gray-400">✕</button>
            </div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="タイトル（例：数学テストで80点以上）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="詳細（任意）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              {(["CASH", "PART"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setRewardType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${rewardType === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}
                >
                  {t === "CASH" ? "現金報酬" : "レアパーツ"}
                </button>
              ))}
            </div>
            {rewardType === "CASH" ? (
              <input
                type="number"
                value={rewardCash}
                onChange={e => setRewardCash(e.target.value)}
                placeholder="報酬額（円）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                min="0"
              />
            ) : (
              <select
                value={rewardPart}
                onChange={e => setRewardPart(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {REWARD_PARTS.map(p => (
                  <option key={p.id} value={p.id}>{(p.emoji ?? "✨") + " " + p.name}（{p.rarity}）</option>
                ))}
              </select>
            )}
            <button
              onClick={create}
              disabled={saving || !title}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50"
            >
              {saving ? "送信中..." : "⚡ ミッションを送信"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
