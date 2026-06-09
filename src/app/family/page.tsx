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
  const [removingId, setRemovingId] = useState<string | null>(null);
  // 招待コード発行(親)
  const [inviteRole, setInviteRole] = useState<"CHILD" | "PARENT">("CHILD");
  const [issuedCode, setIssuedCode] = useState<{ code: string; expiresAt: string; role: string } | null>(null);
  const [remainSec, setRemainSec] = useState(0);
  const [qrSvg, setQrSvg] = useState<string | null>(null);

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

  async function removeMember(id: string, nickname: string) {
    if (!confirm(`「${nickname}」のデバイスを削除しますか？\nそのデバイスからはアクセスできなくなります。`)) return;
    setRemovingId(id); setError("");
    try {
      const r = await fetch(`/api/family/member/${id}`, { method: "DELETE" });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "削除に失敗しました");
      else await load();
    } finally { setRemovingId(null); }
  }

  async function issueCode(role: "CHILD" | "PARENT") {
    setBusy(true); setError(""); setQrSvg(null);
    try {
      const r = await fetch("/api/family/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "コード発行に失敗しました"); return; }
      setIssuedCode(data);
      setRemainSec(600);
      // QR取得
      const qr = await fetch(`/api/family/pair/qr?code=${data.code}`);
      if (qr.ok) setQrSvg(await qr.text());
    } finally { setBusy(false); }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const parents = info?.family?.members.filter(m => m.role === "PARENT") ?? [];
  const children = info?.family?.members.filter(m => m.role !== "PARENT") ?? [];

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
        /* ── 未登録: どちらの端末かを選んでもらう ── */
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-bold text-gray-800 text-sm">🧑‍💼 親の端末をはじめて登録する</h2>
            <p className="text-xs text-gray-400">
              最初の1台はここから。あとから親・子の端末を招待コードで何台でも追加できます。
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
          </div>

          <a
            href="/family/join"
            className="flex items-center gap-3 bg-green-50 rounded-2xl border-2 border-green-200 p-4 hover:bg-green-100 transition-colors"
          >
            <span className="text-2xl">🧒</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-green-800">招待コードをもらった人はこちら</div>
              <div className="text-xs text-green-600">6桁コードを入力して家族に参加(子・2人目以降の親)</div>
            </div>
            <span className="text-green-300 text-lg">›</span>
          </a>
        </>
      ) : (
        /* ── 登録済み: 家族メンバー一覧 + 親なら招待コード発行 ── */
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-bold text-gray-800 text-sm">{info.family?.name}</h2>
            <div>
              <div className="text-[10px] font-bold text-gray-400 mb-1.5">親 ({parents.length})</div>
              <div className="space-y-2">
                {parents.map(m => (
                  <MemberRow
                    key={m.id}
                    m={m}
                    isSelf={m.id === info.member?.id}
                    isParentActor={info.member?.role === "PARENT"}
                    removing={removingId === m.id}
                    onRemove={() => removeMember(m.id, m.nickname)}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 mb-1.5">子 ({children.length})</div>
              {children.length === 0 ? (
                <p className="text-xs text-gray-300">まだ子の端末が登録されていません</p>
              ) : (
                <div className="space-y-2">
                  {children.map(m => (
                    <MemberRow
                      key={m.id}
                      m={m}
                      isSelf={m.id === info.member?.id}
                      isParentActor={info.member?.role === "PARENT"}
                      removing={removingId === m.id}
                      onRemove={() => removeMember(m.id, m.nickname)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {info.member.role === "PARENT" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-bold text-gray-800 text-sm">家族の端末を追加</h2>
              <p className="text-xs text-gray-400">
                招待コードを発行して、相手の端末の
                <span className="font-bold">「設定 → 招待コードで参加」</span>
                で入力してもらいます。コードは<span className="font-bold">10分間・1回だけ</span>有効。
                何人でも順番に追加できます。
              </p>
              <div className="flex gap-2">
                {([
                  { value: "CHILD", label: "🧒 子を招待" },
                  { value: "PARENT", label: "🧑‍💼 親を招待" },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setInviteRole(opt.value)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all
                      ${inviteRole === opt.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {issuedCode ? (
                <div className="text-center py-2 space-y-2">
                  <div className="text-[10px] font-bold text-gray-400">
                    {issuedCode.role === "PARENT" ? "🧑‍💼 親用の招待コード" : "🧒 子用の招待コード"}
                  </div>
                  {qrSvg && (
                    <div
                      className="mx-auto w-44 h-44 rounded-2xl overflow-hidden border border-blue-100 bg-white p-2"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  )}
                  <div className="text-3xl font-black tracking-[0.3em] text-blue-600 font-mono">
                    {issuedCode.code}
                  </div>
                  <div className="text-xs text-gray-400">
                    残り {Math.floor(remainSec / 60)}:{String(remainSec % 60).padStart(2, "0")}
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    QRを相手端末のカメラで読み取るか、<br />
                    <a href="/family/join" className="text-blue-500 font-bold">設定 → 招待コードで参加</a> に
                    6桁を入力してください。
                  </p>
                  <button
                    onClick={() => issueCode(inviteRole)}
                    disabled={busy}
                    className="text-xs text-blue-600 font-bold underline disabled:opacity-50"
                  >
                    新しいコードを発行し直す
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => issueCode(inviteRole)}
                  disabled={busy}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50"
                >
                  {inviteRole === "PARENT" ? "親用の招待コードを発行" : "子用の招待コードを発行"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MemberRow({ m, isSelf, isParentActor, removing, onRemove }: {
  m: { id: string; role: string; nickname: string };
  isSelf: boolean;
  isParentActor: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>{m.role === "PARENT" ? "🧑‍💼" : "🧒"}</span>
      <span className="text-gray-700 font-medium flex-1">{m.nickname}</span>
      {isSelf && (
        <span className="text-[10px] bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 font-bold">この端末</span>
      )}
      {isParentActor && !isSelf && (
        <button
          onClick={onRemove}
          disabled={removing}
          className="text-[10px] text-red-400 hover:text-red-600 font-bold border border-red-200 rounded-full px-2 py-0.5 disabled:opacity-40 transition-colors"
        >
          {removing ? "…" : "削除"}
        </button>
      )}
    </div>
  );
}
