"use client";

import { useState, useEffect, useCallback } from "react";

interface FamilyInfo {
  member: { id: string; role: string; nickname: string } | null;
  family: {
    id: string;
    name: string;
    members: { id: string; role: string; nickname: string; createdAt: string }[];
  } | null;
}

export default function FamilyPage() {
  const [info, setInfo] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupNickname, setSetupNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 招待コード発行(親)
  const [issuedCode, setIssuedCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [remainSec, setRemainSec] = useState(0);
  // 参加(子)
  const [joinCode, setJoinCode] = useState("");
  const [joinNickname, setJoinNickname] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetch("/api/family").then(r => r.json());
      setInfo(data);
    } catch {
      setInfo({ member: null, family: null });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // 招待コードの残り時間カウントダウン
  useEffect(() => {
    if (!issuedCode) return;
    const iv = setInterval(() => {
      const remain = Math.max(0, Math.floor((new Date(issuedCode.expiresAt).getTime() - Date.now()) / 1000));
      setRemainSec(remain);
      if (remain === 0) setIssuedCode(null);
    }, 1000);
    return () => clearInterval(iv);
  }, [issuedCode]);

  async function setup() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: setupNickname || undefined }),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "セットアップに失敗しました");
      else await load();
    } finally { setBusy(false); }
  }

  async function issueCode() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/family/pair", { method: "POST" });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "コード発行に失敗しました");
      else {
        setIssuedCode(data);
        setRemainSec(600);
      }
    } finally { setBusy(false); }
  }

  async function join() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/family/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode, nickname: joinNickname || undefined }),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "参加に失敗しました");
      else {
        setJoinCode("");
        await load();
      }
    } finally { setBusy(false); }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4 max-w-md mx-auto">
      <h1 className="text-lg font-bold text-gray-800">👨‍👩‍👧 家族の設定</h1>
      <p className="text-xs text-gray-400 leading-relaxed">
        家族のデータは家族専用のコンテナに保存され、他の家族からは一切見えません。
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">{error}</div>
      )}

      {!info?.member ? (
        /* ── 未登録: この端末を家族に登録 ── */
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-bold text-gray-800 text-sm">この端末をはじめて登録する</h2>
          <p className="text-xs text-gray-400">
            親の端末はここから登録。子の端末は下の「招待コードで参加」を使ってください。
          </p>
          <input
            value={setupNickname}
            onChange={e => setSetupNickname(e.target.value)}
            placeholder="ニックネーム(例: パパ)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
          />
          <button
            onClick={setup}
            disabled={busy}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50"
          >
            親としてセットアップ
          </button>

          <div className="border-t border-gray-100 pt-3 mt-2 space-y-2">
            <h3 className="font-bold text-gray-700 text-sm">招待コードで参加(子の端末)</h3>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6桁コード"
              inputMode="numeric"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm tracking-[0.3em] text-center font-mono"
            />
            <input
              value={joinNickname}
              onChange={e => setJoinNickname(e.target.value)}
              placeholder="ニックネーム(例: たろう)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
            <button
              onClick={join}
              disabled={busy || joinCode.length !== 6}
              className="w-full bg-green-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50"
            >
              家族に参加
            </button>
          </div>
        </div>
      ) : (
        /* ── 登録済み: 家族情報 + 親なら招待コード発行 ── */
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-800 text-sm mb-3">{info.family?.name}</h2>
            <div className="space-y-2">
              {info.family?.members.map(m => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <span>{m.role === "PARENT" ? "🧑‍💼" : "🧒"}</span>
                  <span className="text-gray-700 font-medium">{m.nickname}</span>
                  <span className="text-[10px] text-gray-400">
                    {m.role === "PARENT" ? "親" : "子"}
                    {m.id === info.member?.id ? " · この端末" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {info.member.role === "PARENT" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-bold text-gray-800 text-sm">子の端末を追加</h2>
              <p className="text-xs text-gray-400">
                発行したコードを子の端末で入力してもらうと、同じ家族に参加できます。
                コードは<span className="font-bold">10分間・1回だけ</span>有効です。
              </p>
              {issuedCode ? (
                <div className="text-center py-3">
                  <div className="text-3xl font-black tracking-[0.3em] text-blue-600 font-mono">
                    {issuedCode.code}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    残り {Math.floor(remainSec / 60)}:{String(remainSec % 60).padStart(2, "0")}
                  </div>
                </div>
              ) : (
                <button
                  onClick={issueCode}
                  disabled={busy}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50"
                >
                  招待コードを発行
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
