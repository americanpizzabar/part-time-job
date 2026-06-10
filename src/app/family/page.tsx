"use client";

import { useState, useEffect, useCallback } from "react";

interface ChildProfile { id: string; name: string; avatar: string; color: string; createdAt: string }
interface Member { id: string; role: string; nickname: string; childProfileId: string | null; createdAt: string }
interface FamilyInfo {
  member: { id: string; role: string; nickname: string; childProfileId: string | null } | null;
  family: { id: string; name: string; members: Member[]; children: ChildProfile[] } | null;
}

const AVATARS = ["🧒", "👦", "👧", "🧑", "🐱", "🐶", "🦊", "🐼", "🦁", "🐯", "🦄", "🐸"];

export default function FamilyPage() {
  const [info, setInfo] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupNickname, setSetupNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  // 子プロファイル追加
  const [newChildName, setNewChildName] = useState("");
  // 招待コード発行
  const [issuedCode, setIssuedCode] = useState<{ code: string; expiresAt: string; role: string; forName?: string } | null>(null);
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: setupNickname || undefined }),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "セットアップに失敗しました");
      else { if (data.recoveryCode) setRecoveryCode(data.recoveryCode); await load(); }
    } finally { setBusy(false); }
  }

  async function addChild() {
    if (!newChildName.trim()) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/family/child", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChildName.trim() }),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "追加に失敗しました");
      else { setNewChildName(""); await load(); }
    } finally { setBusy(false); }
  }

  async function renameChild(id: string, current: string) {
    const name = prompt("子の名前", current);
    if (!name || !name.trim() || name === current) return;
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/family/child/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!r.ok) { const d = await r.json(); setError(d.error ?? "変更に失敗しました"); }
      else await load();
    } finally { setBusy(false); }
  }

  async function cycleAvatar(c: ChildProfile) {
    const next = AVATARS[(AVATARS.indexOf(c.avatar) + 1 + AVATARS.length) % AVATARS.length];
    await fetch(`/api/family/child/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar: next }),
    });
    await load();
  }

  async function deleteChild(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？\nこの子のキャラ・財布・成績データは見えなくなります。`)) return;
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/family/child/${id}`, { method: "DELETE" });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "削除に失敗しました");
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

  async function issueCode(role: "CHILD" | "PARENT", childId?: string, forName?: string) {
    setBusy(true); setError(""); setQrSvg(null);
    try {
      const r = await fetch("/api/family/pair", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, childId }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "コード発行に失敗しました"); return; }
      setIssuedCode({ ...data, forName });
      setRemainSec(600);
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
  const childDevices = info?.family?.members.filter(m => m.role !== "PARENT") ?? [];
  const children = info?.family?.children ?? [];
  const childName = (id: string | null) => children.find(c => c.id === id)?.name ?? "未割当";

  return (
    <div className="px-4 py-6 space-y-4 max-w-md mx-auto">
      <h1 className="text-lg font-bold text-gray-800">👨‍👩‍👧 家族の設定</h1>
      <p className="text-xs text-gray-400 leading-relaxed">
        家族のデータは家族専用のコンテナに保存され、他の家族からは一切見えません。
        きょうだいごとにキャラ・財布・成績は完全に分かれます。
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">{error}</div>
      )}

      {/* 招待コード表示(発行中はページ上部に固定的に出す) */}
      {issuedCode && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 text-center space-y-2">
          <div className="text-[10px] font-bold text-gray-400">
            {issuedCode.role === "PARENT" ? "🧑‍💼 親用の招待コード"
              : `🧒 ${issuedCode.forName ?? "子"} 用の招待コード`}
          </div>
          {qrSvg && (
            <div className="mx-auto w-44 h-44 rounded-2xl overflow-hidden border border-blue-100 bg-white p-2"
              dangerouslySetInnerHTML={{ __html: qrSvg }} />
          )}
          <div className="text-3xl font-black tracking-[0.3em] text-blue-600 font-mono">{issuedCode.code}</div>
          <div className="text-xs text-gray-400">
            残り {Math.floor(remainSec / 60)}:{String(remainSec % 60).padStart(2, "0")}
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            QRを相手端末のカメラで読み取るか、<a href="/family/join" className="text-blue-500 font-bold">設定 → 招待コードで参加</a> に6桁を入力。
          </p>
          <button onClick={() => setIssuedCode(null)} className="text-xs text-gray-400 underline">閉じる</button>
        </div>
      )}

      {!info?.member ? (
        /* ── 未登録 ── */
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-bold text-gray-800 text-sm">🧑‍💼 親の端末をはじめて登録する</h2>
            <p className="text-xs text-gray-400">
              最初の1台はここから。あとから親・子の端末を招待コードで何台でも追加できます。
            </p>
            <input value={setupNickname} onChange={e => setSetupNickname(e.target.value)}
              placeholder="ニックネーム(例: パパ)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            <button onClick={setup} disabled={busy}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50">
              親としてセットアップ
            </button>
          </div>
          <a href="/family/join"
            className="flex items-center gap-3 bg-green-50 rounded-2xl border-2 border-green-200 p-4 hover:bg-green-100 transition-colors">
            <span className="text-2xl">🧒</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-green-800">招待コードをもらった人はこちら</div>
              <div className="text-xs text-green-600">6桁コードを入力して家族に参加(子・2人目以降の親)</div>
            </div>
            <span className="text-green-300 text-lg">›</span>
          </a>
        </>
      ) : (
        <>
          {recoveryCode && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔑</span>
                <h2 className="font-bold text-amber-800 text-sm">リカバリーコード — 今すぐメモしてください</h2>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                親端末をすべて紛失した場合、このコードでのみアクセスを回復できます。<br />
                <span className="font-bold">画面を閉じると二度と表示されません。</span>
              </p>
              <div className="bg-white rounded-xl border border-amber-300 px-4 py-3 text-center font-mono font-black text-xl tracking-[0.2em] text-gray-800 select-all">
                {recoveryCode}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(recoveryCode); setRecoveryCopied(true); }}
                className="w-full border border-amber-400 text-amber-800 rounded-xl py-2 text-xs font-bold">
                {recoveryCopied ? "✓ コピーしました" : "クリップボードにコピー"}
              </button>
              <button onClick={() => setRecoveryCode(null)}
                className="w-full bg-amber-500 text-white rounded-xl py-2.5 text-xs font-bold">
                メモしました — 閉じる
              </button>
            </div>
          )}

          {/* 子プロファイル(きょうだい)管理 */}
          {info.member.role === "PARENT" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-bold text-gray-800 text-sm">🧒 きょうだい(子プロファイル)</h2>
              <p className="text-xs text-gray-400">
                子供ごとにキャラ・財布・成績が分かれます。子を追加し、その子の端末を招待コードで登録します。
              </p>
              <div className="space-y-2">
                {children.map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-xl border border-gray-100 p-2.5"
                    style={{ borderLeft: `4px solid ${c.color}` }}>
                    <button onClick={() => cycleAvatar(c)} className="text-2xl" title="アバターを変更">{c.avatar}</button>
                    <button onClick={() => renameChild(c.id, c.name)}
                      className="flex-1 text-left text-sm font-bold text-gray-700">{c.name}</button>
                    <button onClick={() => issueCode("CHILD", c.id, c.name)} disabled={busy}
                      className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-1 font-bold disabled:opacity-40">
                      端末を追加
                    </button>
                    <button onClick={() => deleteChild(c.id, c.name)} disabled={busy || children.length <= 1}
                      className="text-[10px] text-red-400 border border-red-200 rounded-full px-2 py-1 font-bold disabled:opacity-30">
                      削除
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newChildName} onChange={e => setNewChildName(e.target.value)}
                  placeholder="子の名前(例: ひろと)"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                <button onClick={addChild} disabled={busy || !newChildName.trim()}
                  className="bg-blue-600 text-white rounded-xl px-4 font-bold text-sm disabled:opacity-50">
                  追加
                </button>
              </div>
            </div>
          )}

          {/* 家族の端末一覧 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-bold text-gray-800 text-sm">{info.family?.name} の端末</h2>
            <div>
              <div className="text-[10px] font-bold text-gray-400 mb-1.5">親 ({parents.length})</div>
              <div className="space-y-2">
                {parents.map(m => (
                  <MemberRow key={m.id} m={m} sub="親"
                    isSelf={m.id === info.member?.id} isParentActor={info.member?.role === "PARENT"}
                    removing={removingId === m.id} onRemove={() => removeMember(m.id, m.nickname)} />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 mb-1.5">子の端末 ({childDevices.length})</div>
              {childDevices.length === 0 ? (
                <p className="text-xs text-gray-300">まだ子の端末が登録されていません</p>
              ) : (
                <div className="space-y-2">
                  {childDevices.map(m => (
                    <MemberRow key={m.id} m={m} sub={childName(m.childProfileId)}
                      isSelf={m.id === info.member?.id} isParentActor={info.member?.role === "PARENT"}
                      removing={removingId === m.id} onRemove={() => removeMember(m.id, m.nickname)} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* もう一人の親を招待 */}
          {info.member.role === "PARENT" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-bold text-gray-800 text-sm">🧑‍💼 もう一人の親を招待</h2>
              <p className="text-xs text-gray-400">
                招待コードは<span className="font-bold">10分間・1回だけ</span>有効です。
              </p>
              <button onClick={() => issueCode("PARENT")} disabled={busy}
                className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50">
                親用の招待コードを発行
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MemberRow({ m, sub, isSelf, isParentActor, removing, onRemove }: {
  m: { id: string; role: string; nickname: string };
  sub: string;
  isSelf: boolean;
  isParentActor: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>{m.role === "PARENT" ? "🧑‍💼" : "🧒"}</span>
      <span className="text-gray-700 font-medium">{m.nickname}</span>
      <span className="text-[10px] text-gray-400">· {sub}</span>
      <span className="flex-1" />
      {isSelf && (
        <span className="text-[10px] bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 font-bold">この端末</span>
      )}
      {isParentActor && !isSelf && (
        <button onClick={onRemove} disabled={removing}
          className="text-[10px] text-red-400 hover:text-red-600 font-bold border border-red-200 rounded-full px-2 py-0.5 disabled:opacity-40 transition-colors">
          {removing ? "…" : "削除"}
        </button>
      )}
    </div>
  );
}
