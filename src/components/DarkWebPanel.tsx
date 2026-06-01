"use client";

import { useEffect, useState } from "react";
import { formatJPY } from "@/lib/dateUtils";
import { PARTS, RARITY_META, Part, BRAIN_META, BrainType, FEED_CATEGORY_META, marketSellPrice } from "@/lib/optis";
import GuildPanel from "@/components/GuildPanel";

interface DarkWebPanelProps {
  optis: { level: number; intoLevel: number; needed: number; experience: number; creditScore: number; gcoins?: number; generation?: number };
  onExit: () => void;
  onChanged: () => void;
}

interface FullState {
  equippedAura: string;
  equippedAccessory: string | null;
  equippedBody: string;
  unlocked: string[];
  gcoins: number;
  generation: number;
}

interface SimData {
  windowDays: number;
  grandTotal: number;
  weeklySpend: number;
  weeklyBudget: number;
  categories: { name: string; total: number; perWeekAmount: number; perWeekCount: number; avgPerOccurrence: number }[];
  project: { id: number; name: string; plannedAmount: number; targetAmount: number; total: number; remaining: number; selfSaved: number; selfTarget: number; progressPct: number } | null;
}

interface BrainData { brainType: BrainType; stats: { needsRatio: number; impulseRate: number; avgGap: number; txCount: number } | null; }

interface BankDeposit {
  id: number; principal: number; depositDate: string; maturityDate: string;
  ratePercent: number; status: string; interestEarned: number;
}

interface MarketListing {
  id: string; type: "body" | "aura" | "accessory"; name: string; rarity: typeof PARTS[0]["rarity"];
  color: string; emoji?: string; seasonal?: boolean;
  currentPrice: number; sellPrice: number; basePrice: number; priceDelta: number;
  trend: "up" | "down" | "flat"; owned: boolean; equipped: boolean;
  totalBought: number; totalSold: number;
}

interface FeedItem {
  id: number; title: string; body: string; category: string;
  effectJson: string | null; isActive: boolean; publishedAt: string;
}

type Tab = "matrix" | "market" | "feed" | "brain" | "bank" | "guild" | "closet" | "status";

function calcPriceHack(nowPrice: number, waitMonths: number, dropPct: number) {
  const future = Math.round(nowPrice * (1 - dropPct / 100));
  return { future, saved: nowPrice - future };
}

// Mini sparkline SVG component
function Sparkline({ prices, color }: { prices: number[]; color: string }) {
  if (prices.length < 2) return <span className="text-[10px] text-cyan-800">—</span>;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(1, max - min);
  const w = 48, h = 20;
  const points = prices.map((p, i) => `${(i / (prices.length - 1)) * w},${h - ((p - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} />
    </svg>
  );
}

export default function DarkWebPanel({ optis, onExit, onChanged }: DarkWebPanelProps) {
  const [state, setState] = useState<FullState | null>(null);
  const [sim, setSim] = useState<SimData | null>(null);
  const [brain, setBrain] = useState<BrainData | null>(null);
  const [bankData, setBankData] = useState<{ gcoins: number; deposits: BankDeposit[] } | null>(null);
  const [market, setMarket] = useState<{ listings: MarketListing[]; gcoins: number } | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [tab, setTab] = useState<Tab>("matrix");
  const [depositAmt, setDepositAmt] = useState("");
  const [depositMsg, setDepositMsg] = useState("");
  const [marketMsg, setMarketMsg] = useState("");
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [partHistory, setPartHistory] = useState<{ date: string; price: number }[]>([]);
  const [phNow, setPhNow] = useState("");
  const [phMonths, setPhMonths] = useState("3");
  const [phDrop, setPhDrop] = useState("30");

  const load = () => {
    fetch("/api/optis").then(r => r.json()).then(setState);
    fetch("/api/simulator").then(r => r.json()).then(setSim);
    fetch("/api/brain").then(r => r.json()).then(setBrain);
    fetch("/api/bank").then(r => r.json()).then(setBankData);
    fetch("/api/market").then(r => r.json()).then(setMarket);
    fetch("/api/feed").then(r => r.json()).then(setFeed);
  };
  useEffect(() => { load(); }, []);

  async function equip(part: Part) {
    await fetch("/api/optis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partId: part.id, type: part.type }),
    });
    load(); onChanged();
  }

  async function deposit() {
    const amt = Number(depositAmt);
    if (!amt) return;
    const r = await fetch("/api/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amt }),
    });
    const data = await r.json();
    setDepositMsg(r.ok ? `✅ ${amt}G を預け入れました。満期 +${Math.round(amt * 0.1)}G` : data.error);
    setDepositAmt("");
    fetch("/api/bank").then(r => r.json()).then(setBankData);
    fetch("/api/optis").then(r => r.json()).then(setState);
  }

  async function withdraw(id: number) {
    const r = await fetch(`/api/bank/${id}`, { method: "DELETE" });
    const data = await r.json();
    setDepositMsg(r.ok ? `💸 早期引き出し: ${data.returned}G 返還。利息 ${data.interestLost}G 没収` : data.error);
    fetch("/api/bank").then(r => r.json()).then(setBankData);
    fetch("/api/optis").then(r => r.json()).then(setState);
  }

  async function buyPart(partId: string) {
    const r = await fetch("/api/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "BUY", partId }),
    });
    const data = await r.json();
    setMarketMsg(r.ok ? `✅ 購入完了！ ${data.paid}G 消費。新価格: ${data.newPrice}G` : `❌ ${data.error}`);
    fetch("/api/market").then(r => r.json()).then(setMarket);
    fetch("/api/optis").then(r => r.json()).then(setState);
    onChanged();
  }

  async function sellPart(partId: string) {
    const r = await fetch("/api/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SELL", partId }),
    });
    const data = await r.json();
    setMarketMsg(r.ok ? `💰 売却完了！ ${data.received}G 獲得。新価格: ${data.newPrice}G` : `❌ ${data.error}`);
    fetch("/api/market").then(r => r.json()).then(setMarket);
    fetch("/api/optis").then(r => r.json()).then(setState);
    onChanged();
  }

  async function loadChart(partId: string) {
    setSelectedPart(partId);
    const data = await fetch(`/api/market/${partId}`).then(r => r.json());
    setPartHistory(data.history ?? []);
  }

  const expRemain = optis.needed - optis.intoLevel;
  const gcoins = state?.gcoins ?? optis.gcoins ?? 0;
  const generation = state?.generation ?? optis.generation ?? 1;
  const topCats = sim?.categories.slice(0, 4) ?? [];

  function daysToGoal(extra: number) {
    if (!sim?.project) return "—";
    const { remaining, plannedAmount } = sim.project;
    if (remaining <= 0) return "達成済み！";
    const base = Math.ceil(remaining / Math.max(1, plannedAmount));
    if (extra <= 0) return `あと約 ${base} 週`;
    const next = Math.ceil(remaining / Math.max(1, plannedAmount + extra));
    const diff = base - next;
    return diff > 0 ? `あと約 ${next} 週 (${diff} 週短縮！)` : `あと約 ${base} 週`;
  }

  const TABS: [Tab, string][] = [
    ["matrix", "MATRIX"], ["market", "MARKET"], ["feed", "FEED"], ["brain", "BRAIN"],
    ["bank", "BANK"], ["guild", "GUILD"], ["closet", "CLOSET"], ["status", "STATUS"],
  ];

  const buyable = market?.listings.filter(l => !l.owned).sort((a, b) => a.currentPrice - b.currentPrice) ?? [];
  const sellable = market?.listings.filter(l => l.owned && !l.equipped) ?? [];

  return (
    <div className="fixed inset-0 z-[70] dark-web dark-web-grid overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold neon-flicker tracking-widest" style={{ textShadow: "0 0 8px #22d3ee" }}>
              ◢ DARK WEB MODE ◣
            </h1>
            {generation > 1 && (
              <div className="text-[10px] text-fuchsia-400 font-mono mt-0.5">
                ◈ GENERATION {generation} — 転生ボーナス +{(generation - 1) * 10}% EXP
              </div>
            )}
          </div>
          <button onClick={onExit} className="text-cyan-300 border border-cyan-500/50 rounded-lg px-3 py-1 text-xs">EXIT ▸</button>
        </div>

        {/* 8タブ (2行×4列) */}
        <div className="grid grid-cols-4 gap-1 mb-5">
          {TABS.map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-1.5 text-[9px] font-mono rounded border transition-colors ${tab === t ? "bg-cyan-900/60 border-cyan-400 text-cyan-200" : "border-cyan-900/40 text-cyan-700 hover:text-cyan-500"}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── MATRIX ───────────────────────────────────────────── */}
        {tab === "matrix" && (
          <div className="space-y-4">
            <div className="border border-cyan-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-cyan-500 tracking-widest mb-3">// BUDGET_MATRIX — 過去30日</div>
              {!sim ? <div className="text-cyan-600 text-xs font-mono">LOADING…</div> : (
                <>
                  <div className="grid grid-cols-3 gap-3 font-mono text-sm mb-4">
                    <div><div className="text-cyan-600 text-[10px]">WEEKLY_SPEND</div><div className="text-cyan-200">{formatJPY(sim.weeklySpend)}</div></div>
                    <div><div className="text-cyan-600 text-[10px]">BUDGET</div><div className={sim.weeklyBudget ? "text-emerald-300" : "text-cyan-700"}>{sim.weeklyBudget ? formatJPY(sim.weeklyBudget) : "未設定"}</div></div>
                    <div><div className="text-cyan-600 text-[10px]">SURPLUS</div>
                      <div className={sim.weeklyBudget && sim.weeklyBudget > sim.weeklySpend ? "text-emerald-400" : "text-red-400"}>
                        {sim.weeklyBudget ? formatJPY(sim.weeklyBudget - sim.weeklySpend) : "—"}
                      </div>
                    </div>
                  </div>
                  {topCats.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <div className="text-[10px] text-cyan-600 tracking-widest">TOP CATEGORIES / WEEK</div>
                      {topCats.map(cat => (
                        <div key={cat.name} className="font-mono">
                          <div className="flex justify-between text-xs text-cyan-300">
                            <span>{cat.name}</span><span>{formatJPY(cat.perWeekAmount)}/週</span>
                          </div>
                          <div className="h-1.5 bg-cyan-900/40 rounded mt-0.5">
                            <div className="h-full rounded bg-cyan-400" style={{ width: `${Math.round(cat.perWeekAmount / Math.max(1, topCats[0].perWeekAmount) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {sim?.project && (
              <div className="border border-fuchsia-500/40 rounded-xl p-4 bg-black/40">
                <div className="text-[11px] text-fuchsia-400 tracking-widest mb-2">// PROJECT_HACK — 「{sim.project.name}」</div>
                <div className="font-mono text-xs text-fuchsia-200 mb-3">残り {formatJPY(sim.project.remaining)} ({sim.project.progressPct}% 達成)</div>
                <div className="space-y-2">
                  {topCats.filter(c => c.perWeekAmount > 0).map(cat => (
                    <div key={cat.name} className="bg-black/30 border border-fuchsia-900/40 rounded-lg p-2.5">
                      <div className="text-fuchsia-300 text-xs font-mono">「{cat.name}」を週1回減らすと:</div>
                      <div className="text-emerald-300 text-xs font-mono mt-0.5">→ 週 +{formatJPY(cat.avgPerOccurrence)} 節約 → {daysToGoal(cat.avgPerOccurrence * 0.5)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-yellow-700/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-yellow-500 tracking-widest mb-3">// PRICE_HACK — 天秤シミュレーター</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="text-[10px] text-yellow-600 mb-1">今の値段(円)</div>
                  <input type="number" value={phNow} onChange={e => setPhNow(e.target.value)}
                    className="w-full bg-black/40 border border-yellow-700/50 text-yellow-100 rounded px-2 py-1.5 text-sm focus:outline-none" placeholder="7000" />
                </div>
                <div>
                  <div className="text-[10px] text-yellow-600 mb-1">待つ月数</div>
                  <input type="number" value={phMonths} onChange={e => setPhMonths(e.target.value)}
                    className="w-full bg-black/40 border border-yellow-700/50 text-yellow-100 rounded px-2 py-1.5 text-sm focus:outline-none" min={1} max={24} />
                </div>
              </div>
              <div className="text-[10px] text-yellow-600 mb-1">予想値下がり率(%)</div>
              <input type="range" min={5} max={70} value={phDrop} onChange={e => setPhDrop(e.target.value)} className="w-full accent-yellow-400" />
              <div className="text-center text-yellow-400 font-mono text-sm mb-2">{phDrop}%</div>
              {phNow && Number(phNow) > 0 && (() => {
                const { future, saved } = calcPriceHack(Number(phNow), Number(phMonths), Number(phDrop));
                return (
                  <div className="bg-black/30 border border-yellow-800/40 rounded-lg p-3 font-mono">
                    <div className="flex items-end justify-center gap-4 mb-2">
                      <div className="text-center">
                        <div className="text-yellow-500 text-[10px]">今すぐ</div>
                        <div className="w-16 bg-red-900/50 rounded text-red-300 text-xs text-center py-1">{formatJPY(Number(phNow))}</div>
                      </div>
                      <div className="text-yellow-600 text-xs">⚖️</div>
                      <div className="text-center">
                        <div className="text-yellow-500 text-[10px]">{phMonths}ヶ月後</div>
                        <div className="w-16 bg-emerald-900/50 rounded text-emerald-300 text-xs text-center py-1">{formatJPY(future)}</div>
                      </div>
                    </div>
                    <div className="text-center text-emerald-300 text-sm">節約: <span className="font-bold">{formatJPY(saved)}</span></div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── MARKET ───────────────────────────────────────────── */}
        {tab === "market" && (
          <div className="space-y-3">
            <div className="border border-emerald-600/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-emerald-400 tracking-widest mb-1">// DYNAMIC_MARKET — パーツ価格変動</div>
              <div className="text-[10px] text-emerald-700 mb-3">需給バランスで価格が変動する。安い時に買い、高い時に売れ。</div>
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-emerald-600 text-[10px]">G-COIN BALANCE</div>
                <div className="text-emerald-300 text-2xl font-black">{gcoins} <span className="text-xs">G</span></div>
              </div>

              {marketMsg && (
                <div className="text-xs text-emerald-200 bg-emerald-900/30 border border-emerald-700/30 rounded-lg p-2 mb-3">
                  {marketMsg}
                </div>
              )}
            </div>

            {/* 価格チャート(選択パーツ) */}
            {selectedPart && partHistory.length > 0 && (() => {
              const p = PARTS.find(x => x.id === selectedPart);
              const prices = partHistory.map(h => h.price);
              const trend = prices[prices.length - 1] > prices[0];
              return (
                <div className="border border-emerald-600/30 rounded-xl p-4 bg-black/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-emerald-400 text-xs font-mono">{p?.emoji ?? "◎"} {p?.name}</div>
                    <button onClick={() => setSelectedPart(null)} className="text-emerald-700 text-xs">✕</button>
                  </div>
                  <div className="flex items-end gap-3">
                    <Sparkline prices={prices} color={trend ? "#34d399" : "#f87171"} />
                    <div className="font-mono text-xs text-emerald-300">
                      <div>最新: {prices[prices.length - 1]}G</div>
                      <div className={trend ? "text-emerald-400" : "text-red-400"}>{trend ? "↑ 上昇中" : "↓ 下落中"}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-800 mt-1">直近{partHistory.length}件のデータ</div>
                </div>
              );
            })()}

            {/* 売却可能 */}
            {sellable.length > 0 && (
              <div className="border border-yellow-600/30 rounded-xl p-3 bg-black/40">
                <div className="text-[10px] text-yellow-500 tracking-widest mb-2">// SELL — 所持パーツ(装備外)</div>
                <div className="space-y-2">
                  {sellable.map(listing => (
                    <div key={listing.id} className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
                      <span className="text-base">{listing.emoji ?? "◎"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-yellow-200 text-xs font-mono truncate">{listing.name}</div>
                        <div className="text-yellow-700 text-[10px]">
                          売却: <span className="text-yellow-400">{listing.sellPrice}G</span>
                          <span className="ml-1">{listing.trend === "up" ? "↑" : listing.trend === "down" ? "↓" : "―"}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => loadChart(listing.id)}
                        className="text-[10px] text-emerald-700 border border-emerald-900/40 rounded px-1.5 py-0.5">
                        📈
                      </button>
                      <button
                        onClick={() => sellPart(listing.id)}
                        className="text-[10px] text-yellow-400 border border-yellow-700/40 rounded px-2 py-1 font-bold">
                        売る
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 購入可能 */}
            <div className="border border-emerald-600/30 rounded-xl p-3 bg-black/40">
              <div className="text-[10px] text-emerald-500 tracking-widest mb-2">// BUY — パーツを購入</div>
              {buyable.length === 0 ? (
                <div className="text-emerald-700 text-xs font-mono text-center py-2">全パーツ所持済み</div>
              ) : (
                <div className="space-y-2">
                  {buyable.map(listing => {
                    const canAfford = gcoins >= listing.currentPrice;
                    const priceColor = listing.trend === "up" ? "#34d399" : listing.trend === "down" ? "#f87171" : "#22d3ee";
                    return (
                      <div key={listing.id} className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-base">{listing.emoji ?? (listing.type === "aura" ? "◎" : "▣")}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-cyan-200 text-xs font-mono truncate">{listing.name}</span>
                            {listing.seasonal && <span className="text-[9px] text-orange-400">限定</span>}
                          </div>
                          <div className="text-[10px] flex items-center gap-1">
                            <span style={{ color: RARITY_META[listing.rarity].color }}>{RARITY_META[listing.rarity].label}</span>
                            <span style={{ color: priceColor }} className="font-mono">{listing.currentPrice}G</span>
                            <span style={{ color: priceColor }}>{listing.trend === "up" ? "↑" : listing.trend === "down" ? "↓" : "―"}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => loadChart(listing.id)}
                          className="text-[10px] text-emerald-700 border border-emerald-900/40 rounded px-1.5 py-0.5">
                          📈
                        </button>
                        <button
                          onClick={() => buyPart(listing.id)}
                          disabled={!canAfford}
                          className="text-[10px] text-emerald-400 border border-emerald-700/40 rounded px-2 py-1 font-bold disabled:opacity-30">
                          買う
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FEED ─────────────────────────────────────────────── */}
        {tab === "feed" && (
          <div className="space-y-3">
            <div className="border border-purple-600/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-purple-400 tracking-widest mb-1">// SHADOW_FEED — 世界ハック情報</div>
              <div className="text-[10px] text-purple-700 mb-3">現実の経済とゲームが連動する。これを読め。</div>
            </div>
            {feed.length === 0 ? (
              <div className="text-purple-700 text-xs font-mono text-center py-4">フィードを受信中…</div>
            ) : (
              feed.map(item => {
                const meta = FEED_CATEGORY_META[item.category] ?? FEED_CATEGORY_META.NEWS;
                let effect: { type: string; category: string; multiplier: number } | null = null;
                if (item.effectJson) {
                  try { effect = JSON.parse(item.effectJson); } catch { /* skip */ }
                }
                return (
                  <div key={item.id} className="border rounded-xl p-4 bg-black/40" style={{ borderColor: `${meta.color}40` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{meta.icon}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="font-bold text-xs mb-1.5" style={{ color: meta.color }}>{item.title}</div>
                    <div className="text-[11px] text-gray-400 leading-relaxed">{item.body}</div>
                    {effect && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] bg-yellow-900/30 border border-yellow-700/30 rounded-lg px-2.5 py-1.5">
                        <span>⚡</span>
                        <span className="text-yellow-400 font-bold">
                          {effect.category}カテゴリのNeeds記録でEXP×{effect.multiplier}
                        </span>
                      </div>
                    )}
                    <div className="text-[9px] text-gray-700 mt-2">{new Date(item.publishedAt).toLocaleDateString("ja-JP")}</div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── BRAIN ─────────────────────────────────────────────── */}
        {tab === "brain" && (
          <div className="space-y-3">
            <div className="border border-cyan-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-cyan-500 tracking-widest mb-3">// BRAIN_MATRIX — AIキャラ診断</div>
              {!brain ? <div className="text-cyan-600 text-xs font-mono">ANALYZING…</div> : (
                <>
                  {(() => {
                    const meta = BRAIN_META[brain.brainType];
                    return (
                      <div className="text-center mb-4">
                        <div className="text-5xl mb-1">{meta.emoji}</div>
                        <div className="font-bold text-xl" style={{ color: meta.color }}>{meta.label}</div>
                        <div className="text-xs text-cyan-400 mt-1">{meta.desc}</div>
                      </div>
                    );
                  })()}
                  {brain.stats && (
                    <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                      <div><div className="text-cyan-600 text-[10px]">NEEDS_RATIO</div><div className="text-cyan-200">{brain.stats.needsRatio}%</div></div>
                      <div><div className="text-cyan-600 text-[10px]">IMPULSE_RATE</div><div className={brain.stats.impulseRate > 30 ? "text-red-300" : "text-cyan-200"}>{brain.stats.impulseRate}%</div></div>
                      <div><div className="text-cyan-600 text-[10px]">AVG_GAP_DAYS</div><div className="text-cyan-200">{brain.stats.avgGap}日</div></div>
                      <div><div className="text-cyan-600 text-[10px]">TX_COUNT_30D</div><div className="text-cyan-200">{brain.stats.txCount}件</div></div>
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-cyan-900/40">
                    <div className="text-[10px] text-cyan-600 mb-2 tracking-widest">// OPTIS_RESPONSE_SAMPLES</div>
                    <div className="text-[11px] text-cyan-200/80 bg-black/20 rounded p-2 italic">
                      {brain.brainType === "IMPULSIVE" ? "「おい！またすぐ買おうとしてるだろ！裏画面でシミュレーションしてからにしろ！🔥」" :
                       brain.brainType === "ANALYTICAL" ? "「前回の検討から3日が経過しました。今が買い時かもしれません。」" :
                       brain.brainType === "FRUGAL" ? "「Needsへの投資は自分への最高の贈り物だ。そのまま続けろ！💎」" :
                       "「やっほー！今日もえらい！」"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── BANK ─────────────────────────────────────────────── */}
        {tab === "bank" && (
          <div className="space-y-3">
            <div className="border border-yellow-600/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-yellow-500 tracking-widest mb-1">// TIMEWARP_BANK — 仮想銀行</div>
              <div className="text-[10px] text-yellow-700 mb-3">週利10%・満期前引き出しで利息没収</div>
              <div className="flex items-baseline justify-between mb-4">
                <div className="text-yellow-600 text-[10px]">G-COIN BALANCE</div>
                <div className="text-yellow-300 text-3xl font-black">{gcoins} <span className="text-sm">G</span></div>
              </div>
              {depositMsg && (
                <div className="text-xs text-yellow-200 bg-yellow-900/30 border border-yellow-700/40 rounded-lg p-2 mb-3">{depositMsg}</div>
              )}
              <div className="flex gap-2 mb-4">
                <input type="number" value={depositAmt} onChange={e => setDepositAmt(e.target.value)}
                  className="flex-1 bg-black/40 border border-yellow-700/50 text-yellow-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder="預けるG量" min={5} />
                <button onClick={deposit} disabled={!depositAmt || Number(depositAmt) > gcoins}
                  className="bg-yellow-700 text-white rounded-lg px-4 text-sm font-bold disabled:opacity-40">
                  預ける
                </button>
              </div>
              {bankData && bankData.deposits.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[10px] text-yellow-600 tracking-widest">ACTIVE_DEPOSITS</div>
                  {bankData.deposits.map(d => {
                    const interest = Math.round(d.principal * d.ratePercent / 100);
                    const todayStr = new Date().toISOString().slice(0, 10);
                    return (
                      <div key={d.id} className="bg-black/30 border border-yellow-800/40 rounded-lg p-3 font-mono">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-yellow-300 text-sm font-bold">{d.principal}G → {d.principal + interest}G</div>
                            <div className="text-yellow-700 text-[10px]">満期: {d.maturityDate} | 利息: +{interest}G</div>
                          </div>
                          <div className={`text-[11px] px-2 py-0.5 rounded ${
                            d.status === "MATURED" ? "bg-emerald-900/50 text-emerald-400" :
                            d.status === "WITHDRAWN" ? "bg-red-900/50 text-red-400" :
                            d.maturityDate <= todayStr ? "bg-emerald-900/50 text-emerald-300 animate-pulse" :
                            "bg-yellow-900/30 text-yellow-500"}`}>
                            {d.status === "MATURED" ? "受取済" : d.status === "WITHDRAWN" ? "引出済" : d.maturityDate <= todayStr ? "満期！" : "運用中"}
                          </div>
                        </div>
                        {d.status === "ACTIVE" && d.maturityDate > todayStr && (
                          <button onClick={() => withdraw(d.id)} className="mt-2 text-[11px] text-red-500 border border-red-800/40 rounded px-2 py-0.5">
                            早期引き出し(利息没収)
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-yellow-700 text-xs font-mono text-center py-2">預け入れなし</div>
              )}
            </div>
          </div>
        )}

        {/* ── GUILD ─────────────────────────────────────────────── */}
        {tab === "guild" && <GuildPanel unlocked={state?.unlocked ?? []} />}

        {/* ── CLOSET ────────────────────────────────────────────── */}
        {tab === "closet" && (
          <div className="border border-cyan-500/40 rounded-xl p-4 bg-black/40">
            <div className="text-[11px] text-cyan-500 tracking-widest mb-3">// CUSTOMIZE — 所持パーツを装備</div>
            <div className="grid grid-cols-3 gap-2">
              {PARTS.map(part => {
                const owned = state?.unlocked.includes(part.id);
                const equipped = state?.equippedAura === part.id || state?.equippedAccessory === part.id || state?.equippedBody === part.id;
                const mktEntry = market?.listings.find(l => l.id === part.id);
                return (
                  <button key={part.id} disabled={!owned} onClick={() => owned && equip(part)}
                    className={`rounded-lg p-2 text-center border text-xs transition-all
                      ${equipped ? "border-cyan-300 bg-cyan-500/20" : owned ? "border-cyan-800 bg-black/40" : "border-gray-800 opacity-30"}`}>
                    <div className="text-xl mb-0.5">{part.emoji ?? (part.type === "aura" ? "◎" : "▣")}</div>
                    <div className="text-cyan-200 leading-tight text-[10px]">{part.name}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: RARITY_META[part.rarity].color }}>
                      {owned ? RARITY_META[part.rarity].label : "未所持"}
                    </div>
                    {owned && mktEntry && !equipped && (
                      <div className="text-[9px] text-yellow-600 mt-0.5">{marketSellPrice(mktEntry.currentPrice)}G</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STATUS ────────────────────────────────────────────── */}
        {tab === "status" && (
          <div className="border border-cyan-500/40 rounded-xl p-4 bg-black/40">
            <div className="text-[11px] text-cyan-500 tracking-widest mb-3">// STATUS_HACK</div>
            <div className="grid grid-cols-2 gap-3 font-mono text-sm">
              {[
                ["LEVEL", String(optis.level)],
                ["CREDIT_SCORE", `${optis.creditScore}/100`],
                ["TOTAL_EXP", String(optis.experience)],
                ["EXP_TO_NEXT", String(expRemain)],
                ["G_COINS", `${gcoins}G`],
                ["GENERATION", `Gen.${generation}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-cyan-600 text-[10px]">{k}</div>
                  <div className="text-cyan-200 text-lg">{v}</div>
                </div>
              ))}
            </div>
            {generation > 1 && (
              <div className="mt-4 pt-3 border-t border-cyan-900/40">
                <div className="text-[10px] text-fuchsia-500 tracking-widest mb-1">// GENERATION_BONUS</div>
                <div className="text-xs text-fuchsia-300 font-mono">EXP_MULTIPLIER: ×{(1 + (generation - 1) * 0.1).toFixed(1)}</div>
                <div className="text-xs text-fuchsia-300 font-mono">DARK_WEB_HOUR: {generation >= 5 ? "19:00" : generation >= 3 ? "20:00" : "21:00"}〜</div>
                <div className="text-xs text-fuchsia-300 font-mono">ADVICE_LEVEL: {generation >= 2 ? "ADVANCED" : "BASIC"}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
