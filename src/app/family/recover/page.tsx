"use client";

import { useState } from "react";

export default function FamilyRecoverPage() {
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [newCode, setNewCode] = useState("");

  async function recover() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/family/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, nickname: nickname || undefined }),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "復元に失敗しました");
      else { setDone(true); setNewCode(data.newRecoveryCode ?? ""); }
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="px-4 py-10 max-w-md mx-auto text-center space-y-4">
        <div className="text-5xl">🔓</div>
        <h1 className="text-xl font-bold text-gray-800">アクセスを回復しました</h1>
        <p className="text-sm text-gray-500">この端末が親として再登録されました。</p>
        {newCode && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-left space-y-2">
            <p className="text-xs font-bold text-amber-700">⚠️ 新しいリカバリーコード (今度こそ保存してください)</p>
            <p className="text-lg font-mono font-black tracking-widest text-amber-900 text-center break-all">{newCode}</p>
            <p className="text-[11px] text-amber-600">旧コードは無効になりました。このコードはここにしか表示されません。</p>
          </div>
        )}
        <a href="/family" className="block w-full bg-blue-600 text-white rounded-xl py-3.5 font-bold text-sm">
          家族の設定へ
        </a>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-md mx-auto space-y-5">
      <div className="text-center space-y-1">
        <div className="text-4xl">🔑</div>
        <h1 className="text-xl font-bold text-gray-800">リカバリーコードで復元</h1>
        <p className="text-xs text-gray-400 leading-relaxed">
          家族セットアップ時にメモした 16 文字のコードを入力してください。<br />
          この端末が親として再登録されます。
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 text-center">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2">リカバリーコード (16文字)</label>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="XXXX XXXX XXXX XXXX"
            autoFocus
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-lg tracking-[0.2em] text-center font-mono font-bold text-gray-800 focus:outline-none focus:border-blue-400"
          />
          <p className="text-[10px] text-gray-400 mt-1 text-center">大文字・数字のみ。スペースは無視されます。</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2">ニックネーム</label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="例: パパ"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
          />
        </div>
        <button
          onClick={recover}
          disabled={busy || code.length < 8}
          className="w-full bg-orange-600 text-white rounded-xl py-3.5 font-bold text-sm disabled:opacity-40"
        >
          {busy ? "確認中..." : "アクセスを回復する"}
        </button>
      </div>

      <p className="text-[11px] text-gray-400 text-center leading-relaxed">
        リカバリーコードをなくした場合は、データベースへの直接アクセスが必要です。<br />
        Neon ダッシュボードから管理者が対応します。
      </p>
    </div>
  );
}
