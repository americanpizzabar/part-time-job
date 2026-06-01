"use client";

import { useState, useEffect, useCallback } from "react";
import { currentISOWeek, isGuildAuraActive, PARTS, getPart } from "@/lib/optis";
import { formatJPY } from "@/lib/dateUtils";

interface Member {
  id: number;
  nickname: string;
  isOwner: boolean;
  budgetMetWeek: string | null;
}

interface Guild {
  id: number;
  name: string;
  inviteCode: string;
  auraColor: string;
  members: Member[];
  week: string;
  allMet: boolean;
}

interface TradeOffer {
  id: number;
  offerPartId: string;
  wantPartId: string | null;
  token: string;
  expiresAt: string;
}

type View = "guild" | "trade_create" | "trade_accept";

export default function GuildPanel({ unlocked }: { unlocked: string[] }) {
  const [guild, setGuild] = useState<Guild | null | undefined>(undefined);
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  const [view, setView] = useState<View>("guild");
  const [formName, setFormName] = useState("");
  const [formNick, setFormNick] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinNick, setJoinNick] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  // trade create
  const [offerPart, setOfferPart] = useState("");
  const [wantPart, setWantPart] = useState("");
  const [createdOffer, setCreatedOffer] = useState<TradeOffer | null>(null);
  // trade accept
  const [acceptToken, setAcceptToken] = useState("");
  const [foundOffer, setFoundOffer] = useState<TradeOffer | null>(null);
  const [givePart, setGivePart] = useState("");

  const week = currentISOWeek();

  const load = useCallback(async () => {
    const [g, t] = await Promise.all([
      fetch("/api/guild").then(r => r.json()),
      fetch("/api/trade").then(r => r.json()),
    ]);
    setGuild(g);
    setTrades(t);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createGuild() {
    if (!formName || !formNick) return;
    setLoading(true);
    const r = await fetch("/api/guild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formName, nickname: formNick }),
    });
    const data = await r.json();
    if (!r.ok) { setMsg(data.error); setLoading(false); return; }
    setLoading(false);
    load();
  }

  async function joinGuild() {
    if (!joinCode || !joinNick) return;
    setLoading(true);
    const r = await fetch("/api/guild/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: joinCode, nickname: joinNick }),
    });
    const data = await r.json();
    if (!r.ok) { setMsg(data.error); setLoading(false); return; }
    setLoading(false);
    load();
  }

  async function checkBudget(memberId: number) {
    await fetch(`/api/guild/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CHECK_BUDGET" }),
    });
    load();
  }

  async function createTrade() {
    if (!offerPart) return;
    setLoading(true);
    const r = await fetch("/api/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerPartId: offerPart, wantPartId: wantPart || null }),
    });
    const data = await r.json();
    setLoading(false);
    if (!r.ok) { setMsg(data.error); return; }
    setCreatedOffer(data);
    load();
  }

  async function cancelTrade(token: string) {
    await fetch(`/api/trade/${token}`, { method: "DELETE" });
    setCreatedOffer(null);
    load();
  }

  async function lookupToken() {
    if (!acceptToken) return;
    const r = await fetch(`/api/trade/${acceptToken.toUpperCase()}`);
    const data = await r.json();
    if (!r.ok) { setMsg(data.error); return; }
    setFoundOffer(data);
  }

  async function acceptTrade() {
    if (!foundOffer || !givePart) return;
    setLoading(true);
    const r = await fetch(`/api/trade/${foundOffer.token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ givePartId: givePart }),
    });
    const data = await r.json();
    setLoading(false);
    if (!r.ok) { setMsg(data.error); return; }
    setFoundOffer(null);
    setAcceptToken("");
    setGivePart("");
    setMsg(`✅ トレード完了！${getPart(data.gained)?.name ?? data.gained} を入手！`);
    load();
  }

  const tradableParts = PARTS.filter(p => unlocked.includes(p.id) && p.id !== "body_core" && p.id !== "aura_basic");
  const allParts = PARTS;

  if (guild === undefined) return <div className="text-xs text-cyan-600 font-mono">LOADING…</div>;

  return (
    <div className="space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-lg bg-cyan-900/40 text-cyan-200 border border-cyan-700/40">
          {msg}
          <button className="ml-2 text-cyan-500" onClick={() => setMsg("")}>✕</button>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-2">
        {([["guild", "ALLIANCE"], ["trade_create", "OFFER"], ["trade_accept", "ACCEPT"]] as [View, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-1 text-[11px] font-mono rounded border ${view === v ? "border-cyan-400 bg-cyan-900/50 text-cyan-200" : "border-cyan-900/40 text-cyan-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── ギルド ── */}
      {view === "guild" && (
        <>
          {!guild ? (
            <div className="space-y-4">
              <div className="border border-cyan-700/40 rounded-xl p-4 space-y-2 bg-black/30">
                <div className="text-[10px] text-cyan-600 tracking-widest">// CREATE_GUILD</div>
                <input className="w-full bg-black/40 border border-cyan-700/50 text-cyan-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                  placeholder="ギルド名" value={formName} onChange={e => setFormName(e.target.value)} />
                <input className="w-full bg-black/40 border border-cyan-700/50 text-cyan-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                  placeholder="自分のニックネーム" value={formNick} onChange={e => setFormNick(e.target.value)} />
                <button onClick={createGuild} disabled={loading || !formName || !formNick}
                  className="w-full bg-cyan-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40">
                  {loading ? "作成中…" : "ギルドを作る"}
                </button>
              </div>

              <div className="border border-fuchsia-700/40 rounded-xl p-4 space-y-2 bg-black/30">
                <div className="text-[10px] text-fuchsia-400 tracking-widest">// JOIN_GUILD</div>
                <input className="w-full bg-black/40 border border-fuchsia-700/50 text-fuchsia-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder="招待コード(6文字)" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} />
                <input className="w-full bg-black/40 border border-fuchsia-700/50 text-fuchsia-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder="自分のニックネーム" value={joinNick} onChange={e => setJoinNick(e.target.value)} />
                <button onClick={joinGuild} disabled={loading || !joinCode || !joinNick}
                  className="w-full bg-fuchsia-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40">
                  {loading ? "参加中…" : "参加する"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border border-cyan-500/40 rounded-xl p-4 bg-black/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-cyan-200 font-bold">{guild.name}</div>
                    <div className="text-[10px] text-cyan-600 font-mono mt-0.5">招待コード: {guild.inviteCode}</div>
                  </div>
                  {guild.allMet && (
                    <div className="text-xs font-bold text-yellow-300 bg-yellow-900/40 border border-yellow-600/40 rounded-full px-3 py-1">
                      ✨ 同盟オーラ発動中！
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-cyan-600 tracking-widest mb-2">// MEMBERS — 今週 {week}</div>
                <div className="space-y-2">
                  {guild.members.map(m => {
                    const met = m.budgetMetWeek === week;
                    return (
                      <div key={m.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${met ? "bg-emerald-400" : "bg-gray-600"}`} />
                          <span className="text-sm text-cyan-200">{m.nickname}{m.isOwner ? " 👑" : ""}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {met ? (
                            <span className="text-[11px] text-emerald-400">✓ 予算達成</span>
                          ) : (
                            <button onClick={() => checkBudget(m.id)}
                              className="text-[11px] border border-cyan-700/50 text-cyan-400 rounded px-2 py-0.5 hover:border-cyan-400">
                              達成マーク
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {guild.members.length < 2 && (
                  <div className="mt-3 text-[11px] text-cyan-700">
                    友達に招待コード <span className="text-cyan-400 font-bold">{guild.inviteCode}</span> を教えてギルドに招こう！
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── トレードオファー作成 ── */}
      {view === "trade_create" && (
        <div className="border border-emerald-700/40 rounded-xl p-4 bg-black/30 space-y-3">
          <div className="text-[10px] text-emerald-400 tracking-widest">// CREATE_TRADE_OFFER</div>
          <div className="text-[11px] text-emerald-300/70">友達にスマホを渡して、トークンを入力してもらおう</div>

          {!createdOffer ? (
            <>
              <div>
                <div className="text-[10px] text-emerald-600 mb-1">渡すパーツ</div>
                <select className="w-full bg-black/40 border border-emerald-700/50 text-emerald-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  value={offerPart} onChange={e => setOfferPart(e.target.value)}>
                  <option value="">選んでください</option>
                  {tradableParts.map(p => (
                    <option key={p.id} value={p.id}>{p.emoji ?? ""} {p.name} ({p.rarity})</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-[10px] text-emerald-600 mb-1">欲しいパーツ(省略可)</div>
                <select className="w-full bg-black/40 border border-emerald-700/50 text-emerald-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  value={wantPart} onChange={e => setWantPart(e.target.value)}>
                  <option value="">なんでもOK</option>
                  {allParts.filter(p => !unlocked.includes(p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.emoji ?? ""} {p.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={createTrade} disabled={loading || !offerPart}
                className="w-full bg-emerald-700 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-40">
                {loading ? "作成中…" : "トレードを開始"}
              </button>
            </>
          ) : (
            <div className="text-center space-y-3">
              <div className="text-emerald-300 text-sm">友達にこのコードを入力してもらおう</div>
              <div className="text-5xl font-black text-emerald-400 tracking-[0.3em]">{createdOffer.token}</div>
              <div className="text-[10px] text-emerald-700">有効期限: {new Date(createdOffer.expiresAt).toLocaleTimeString("ja-JP")}</div>
              <button onClick={() => cancelTrade(createdOffer.token)}
                className="text-xs text-red-400 border border-red-800/50 rounded-lg px-4 py-1.5">
                キャンセル
              </button>
            </div>
          )}

          {/* 進行中のオファー一覧 */}
          {trades.length > 0 && (
            <div className="pt-2 border-t border-emerald-900/40">
              <div className="text-[10px] text-emerald-600 mb-1">進行中のオファー</div>
              {trades.map(t => (
                <div key={t.id} className="flex items-center justify-between text-xs text-emerald-300 py-1">
                  <span>{getPart(t.offerPartId)?.name ?? t.offerPartId} → {t.token}</span>
                  <button onClick={() => cancelTrade(t.token)} className="text-red-500">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── トレード受け入れ ── */}
      {view === "trade_accept" && (
        <div className="border border-fuchsia-700/40 rounded-xl p-4 bg-black/30 space-y-3">
          <div className="text-[10px] text-fuchsia-400 tracking-widest">// ACCEPT_TRADE</div>

          {!foundOffer ? (
            <>
              <input className="w-full bg-black/40 border border-fuchsia-700/50 text-fuchsia-100 rounded-lg px-3 py-2 text-sm focus:outline-none tracking-widest font-bold"
                placeholder="トークン(6文字)" value={acceptToken} onChange={e => setAcceptToken(e.target.value.toUpperCase())} maxLength={6} />
              <button onClick={lookupToken} disabled={acceptToken.length < 6}
                className="w-full bg-fuchsia-700 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-40">
                オファーを確認
              </button>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="text-[11px] text-fuchsia-400 mb-1">もらえるパーツ</div>
                <div className="text-fuchsia-200 font-bold text-lg">
                  {getPart(foundOffer.offerPartId)?.emoji ?? ""} {getPart(foundOffer.offerPartId)?.name ?? foundOffer.offerPartId}
                </div>
                {foundOffer.wantPartId && (
                  <div className="text-[11px] text-fuchsia-600 mt-1">希望: {getPart(foundOffer.wantPartId)?.name}</div>
                )}
              </div>
              <div>
                <div className="text-[10px] text-fuchsia-600 mb-1">渡すパーツ</div>
                <select className="w-full bg-black/40 border border-fuchsia-700/50 text-fuchsia-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  value={givePart} onChange={e => setGivePart(e.target.value)}>
                  <option value="">選んでください</option>
                  {tradableParts
                    .filter(p => !foundOffer.wantPartId || p.id === foundOffer.wantPartId)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.emoji ?? ""} {p.name}</option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setFoundOffer(null)} className="flex-1 border border-fuchsia-800/50 text-fuchsia-600 rounded-lg py-2 text-sm">戻る</button>
                <button onClick={acceptTrade} disabled={loading || !givePart}
                  className="flex-1 bg-fuchsia-700 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-40">
                  {loading ? "交換中…" : "交換する！"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
