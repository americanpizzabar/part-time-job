"use client";

import { useState, useEffect } from "react";

interface FamilyInfo {
  member: { id: string; role: string; nickname: string } | null;
  family: { id: string; name: string } | null;
}

// こども向け: 招待コード入力専用ページ(おおきく・かんたんに)
export default function FamilyJoinPage() {
  const [info, setInfo] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("code") ?? "";
  });
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState<{ nickname: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/family")
      .then(r => r.json())
      .then(setInfo)
      .catch(() => setInfo({ member: null, family: null }))
      .finally(() => setLoading(false));
  }, []);

  async function join() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/family/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, nickname: nickname || undefined }),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "さんかに しっぱいしました");
      else setJoined(data.member);
    } finally { setBusy(false); }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (joined) {
    return (
      <div className="px-4 py-10 max-w-md mx-auto text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h1 className="text-xl font-bold text-gray-800">かぞくに さんかしたよ!</h1>
        <p className="text-sm text-gray-500">
          {joined.nickname} として とうろくされました。
        </p>
        <a href="/" className="block w-full bg-blue-600 text-white rounded-xl py-3.5 font-bold text-sm">
          ホームへ いく
        </a>
      </div>
    );
  }

  if (info?.member) {
    return (
      <div className="px-4 py-10 max-w-md mx-auto text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold text-gray-800">もう さんかずみだよ</h1>
        <p className="text-sm text-gray-500">
          この たんまつは「{info.member.nickname}」として とうろくされています。
        </p>
        <a href="/" className="block w-full bg-blue-600 text-white rounded-xl py-3.5 font-bold text-sm">
          ホームへ いく
        </a>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-md mx-auto space-y-5">
      <div className="text-center space-y-1">
        <div className="text-4xl">🧒</div>
        <h1 className="text-xl font-bold text-gray-800">かぞくに さんかする</h1>
        <p className="text-xs text-gray-400 leading-relaxed">
          おうちのひとに もらった <span className="font-bold text-gray-600">6つの すうじ</span> を いれてね
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 text-center">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 text-center">しょうたいコード</label>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            autoFocus
            className="w-full border-2 border-blue-200 rounded-2xl px-3 py-4 text-3xl tracking-[0.4em] text-center font-mono font-black text-blue-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 text-center">きみの なまえ</label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="ニックネーム(例: たろう)"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-center"
          />
        </div>
        <button
          onClick={join}
          disabled={busy || code.length !== 6}
          className="w-full bg-green-600 text-white rounded-xl py-4 font-bold text-base disabled:opacity-40"
        >
          {busy ? "さんかちゅう..." : "さんかする!"}
        </button>
      </div>

      <p className="text-[11px] text-gray-400 text-center leading-relaxed">
        コードは 10ぷんかん・1かいだけ つかえます。<br />
        うまくいかないときは おうちのひとに あたらしいコードを だしてもらってね。
      </p>
    </div>
  );
}
