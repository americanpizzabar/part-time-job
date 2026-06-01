"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { formatJPY } from "@/lib/dateUtils";
import { OptisForm, BrainType, FORM_META, STAGE_LABEL, randomMotion, isDarkWebHour, generationBonus, CRYSTALLIZE_MIN_LEVEL, CRYSTALLIZE_MIN_STAGE } from "@/lib/optis";
import { playExpGain, playNmdClaim } from "@/lib/sound";
import OptisCreature from "@/components/OptisCreature";
import QuickAddModal from "@/components/QuickAddModal";
import RouletteModal from "@/components/RouletteModal";
import DarkWebPanel from "@/components/DarkWebPanel";
import MissionInbox from "@/components/MissionInbox";
import ChestBanner from "@/components/ChestBanner";
import EvolutionCutin from "@/components/EvolutionCutin";

interface OptisData {
  experience: number;
  creditScore: number;
  equippedAura: string;
  equippedAccessory: string | null;
  spunToday: boolean;
  nmdToday: boolean;
  frozen: boolean;
  freezeUntil: string | null;
  level: number;
  intoLevel: number;
  needed: number;
  stage: 1 | 2 | 3;
  form: OptisForm;
  needsRatio: number;
  wantsRatio: number;
  awakening: number;
  awakeningTier: number;
  budget: { budget: number; spent: number; usageRatio: number; withinBudget: boolean; professional: boolean } | null;
  archive: { resistedTotal: number; items: { id: number; amount: number; date: string; memo: string | null }[] };
  activeLoan: { id: number; purpose: string; principal: number; monthlyPayment: number; months: number; paidMonths: number; remaining: number } | null;
  crystalCount: number;
  generation: number;
}

interface ActiveProject {
  id: number;
  name: string;
  status: string;
  progressPct: number;
  remaining: number;
  pendingBoostCount: number;
}

interface Balance { wallet: number; free: number; saved: number; }
interface GoalSummary { id: number; name: string; progress: number; saved: number; targetAmount: number; remaining: number; isAchieved: boolean; }

export default function OptisLabPage() {
  const [optis, setOptis] = useState<OptisData | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [topGoal, setTopGoal] = useState<GoalSummary | null>(null);
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null);
  const [brainType, setBrainType] = useState<BrainType>("BALANCED");
  const [crystalizing, setCrystalizing] = useState(false);
  const [crystalMsg, setCrystalMsg] = useState<string | null>(null);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanForm, setLoanForm] = useState({ purpose: "", principal: "", months: "3" });
  const [loanSaving, setLoanSaving] = useState(false);
  const [awakeBurst, setAwakeBurst] = useState(false);
  const [anim, setAnim] = useState<string>("optis-idle");
  const [bubble, setBubble] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [expPop, setExpPop] = useState<number | null>(null);
  const [darkWeb, setDarkWeb] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [nmdAsk, setNmdAsk] = useState(false);
  const [evolution, setEvolution] = useState<{ fromForm: OptisForm; fromStage: 1 | 2 | 3; toForm: OptisForm; toStage: 1 | 2 | 3 } | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevEvoRef = useRef<{ form: OptisForm; stage: 1 | 2 | 3 } | null>(null);
  const evoActiveRef = useRef(false);
  const pendingRouletteRef = useRef(false);

  // 進化/変身の検知(前回の形態・ステージと比較)
  const detectEvo = useCallback((o: OptisData) => {
    const cur = { form: o.form, stage: o.stage };
    let prev = prevEvoRef.current;
    if (!prev) {
      try { prev = JSON.parse(localStorage.getItem("optis-evo") || "null"); } catch { prev = null; }
    }
    if (prev && (prev.stage !== cur.stage || prev.form !== cur.form)) {
      setEvolution({ fromForm: prev.form, fromStage: prev.stage, toForm: cur.form, toStage: cur.stage });
      evoActiveRef.current = true;
    }
    prevEvoRef.current = cur;
    localStorage.setItem("optis-evo", JSON.stringify(cur));
  }, []);

  const fetchAll = useCallback(async () => {
    const [o, b, goals, projects, brain] = await Promise.all([
      fetch("/api/optis").then(r => r.json()),
      fetch("/api/balance").then(r => r.json()),
      fetch("/api/goals").then(r => r.json()),
      fetch("/api/projects").then(r => r.json()),
      fetch("/api/brain").then(r => r.json()).catch(() => ({ brainType: "BALANCED" })),
    ]);
    setOptis(o);
    setBalance(b);
    if (brain?.brainType) setBrainType(brain.brainType as BrainType);
    const active = (goals as GoalSummary[]).filter(g => !g.isAchieved);
    setTopGoal(active.length > 0 ? active[0] : null);
    const ap = (projects as ActiveProject[]).find(p => p.status === "ACTIVE");
    setActiveProject(ap ?? null);
    detectEvo(o as OptisData);
    return o as OptisData;
  }, [detectEvo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // NMDダイアログ: 21時以降、当日未回答なら1回表示
  useEffect(() => {
    if (!optis) return;
    const now = new Date();
    if (now.getHours() < 21) return;
    const key = `nmd-asked-${new Date().toISOString().slice(0, 10)}`;
    if (!optis.nmdToday && !localStorage.getItem(key)) {
      setNmdAsk(true);
    }
  }, [optis]);

  // シェイク検知
  useEffect(() => {
    let last = 0;
    function onMotion(e: DeviceMotionEvent) {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.abs(a.x ?? 0) + Math.abs(a.y ?? 0) + Math.abs(a.z ?? 0);
      const now = Date.now();
      if (mag > 30 && now - last > 1200) {
        last = now;
        triggerAnim("optis-shake", "うわ〜！回っちゃう〜🌀");
      }
    }
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, []);

  function triggerAnim(animClass: string, text: string) {
    setAnim(animClass);
    setBubble(text);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => {
      setAnim("optis-idle");
      setBubble(null);
    }, 1800);
  }

  function handleTap() {
    if (optis?.frozen) {
      triggerAnim("optis-glitch", "…ピ…バグってる…動けない…");
      return;
    }
    const m = randomMotion(brainType);
    triggerAnim(m.anim, m.text);
  }

  // コア長押し → ダークウェブ
  function coreDown() {
    if (!isDarkWebHour()) return;
    pressTimer.current = setTimeout(() => {
      setGlitch(true);
      setTimeout(() => { setGlitch(false); setDarkWeb(true); }, 600);
    }, 3000);
  }
  function coreUp() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  async function handleSaved(info: { expGain: number; awakened?: boolean }) {
    setShowAdd(false);
    if (info.expGain > 0) {
      setExpPop(info.expGain);
      playExpGain();
      setTimeout(() => setExpPop(null), 1100);
    }
    if (info.awakened) {
      setAwakeBurst(true);
      setTimeout(() => setAwakeBurst(false), 2400);
    }
    const fresh = await fetchAll();
    // 本日初回ならルーレット起動(進化カットイン中は閉じてから)
    if (!fresh.spunToday && !fresh.frozen) {
      if (evoActiveRef.current) {
        pendingRouletteRef.current = true;
      } else {
        setTimeout(() => setShowRoulette(true), 400);
      }
    }
  }

  function closeEvolution() {
    setEvolution(null);
    evoActiveRef.current = false;
    if (pendingRouletteRef.current) {
      pendingRouletteRef.current = false;
      setTimeout(() => setShowRoulette(true), 300);
    }
  }

  async function crystallize() {
    setCrystalizing(true);
    const r = await fetch("/api/optis/crystallize", { method: "POST" });
    const data = await r.json();
    if (r.ok) {
      setCrystalMsg(`✨ メモリーキューブ生成！Gen.${data.newGeneration - 1} の記憶が結晶化されました`);
      localStorage.removeItem("optis-evo");
      fetchAll();
    } else {
      setCrystalMsg(`❌ ${data.error}`);
    }
    setCrystalizing(false);
    setTimeout(() => setCrystalMsg(null), 3500);
  }

  async function requestLoan() {
    if (!loanForm.purpose.trim() || !loanForm.principal) return;
    setLoanSaving(true);
    const r = await fetch("/api/loan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: loanForm.purpose, principal: Number(loanForm.principal), months: Number(loanForm.months) }),
    });
    if (r.ok) {
      setShowLoanForm(false);
      setLoanForm({ purpose: "", principal: "", months: "3" });
      fetchAll();
    } else {
      const d = await r.json();
      alert(d.error);
    }
    setLoanSaving(false);
  }

  async function answerNmd(noSpending: boolean) {
    setNmdAsk(false);
    localStorage.setItem(`nmd-asked-${new Date().toISOString().slice(0, 10)}`, "1");
    await fetch("/api/optis/nmd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noSpending }),
    });
    if (noSpending) {
      playNmdClaim();
      triggerAnim("optis-jump", "ノーマネーデー達成！ルーレット確変だ⚡");
    }
    fetchAll();
  }

  if (!optis) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (darkWeb) {
    return <DarkWebPanel optis={optis} onExit={() => setDarkWeb(false)} onChanged={fetchAll} />;
  }

  const meta = FORM_META[optis.form];
  const expPct = Math.round((optis.intoLevel / optis.needed) * 100);
  const isProfessional = optis.form === "PROFESSIONAL";

  return (
    <div className="space-y-4 relative">
      {/* グリッチ遷移フラッシュ */}
      {glitch && <div className="fixed inset-0 z-[80] bg-cyan-400 glitch-flash pointer-events-none" />}

      {/* 覚醒バースト通知 */}
      {awakeBurst && (
        <div className="fixed inset-0 z-[75] pointer-events-none flex items-center justify-center">
          <div className="reward-pop text-center bg-black/70 rounded-2xl px-8 py-5">
            <div className="text-4xl mb-1">📚✨</div>
            <div className="text-white font-extrabold text-lg">覚醒ティアUP！</div>
            <div className="text-yellow-300 text-sm mt-0.5">装備エフェクトが強化された！</div>
          </div>
        </div>
      )}

      {/* ステータスバー */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
          <div className="text-[10px] text-gray-400">財布</div>
          <div className="text-sm font-bold text-gray-800">{balance ? formatJPY(balance.wallet) : "—"}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
          <div className="text-[10px] text-gray-400">自由に使える</div>
          <div className="text-sm font-bold text-green-600">{balance ? formatJPY(balance.free) : "—"}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
          <div className="text-[10px] text-gray-400">信用スコア</div>
          <div className="text-sm font-bold text-indigo-600">{optis.creditScore}</div>
        </div>
      </div>

      {/* 目標貯金メーター */}
      {topGoal && (
        <Link href="/goals" className="block bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1 text-xs">
            <span className="font-medium text-gray-700">🎯 {topGoal.name}</span>
            <span className="text-gray-400">あと {formatJPY(topGoal.remaining)}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${topGoal.progress}%`, background: "linear-gradient(90deg,#3b82f6,#6366f1)" }} />
          </div>
        </Link>
      )}

      {/* プロフェッショナル形態バッジ */}
      {isProfessional && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2.5">
          <span className="text-xl">💼</span>
          <div>
            <div className="text-xs font-bold text-emerald-700">プロフェッショナル形態 解放中！</div>
            <div className="text-[11px] text-emerald-500">先週の予算を90%以上使い切り、1円もオーバーしなかった！</div>
          </div>
        </div>
      )}

      {/* 世代バッジ */}
      {optis.generation > 1 && (
        <div className="flex items-center gap-2 bg-fuchsia-50 border border-fuchsia-300 rounded-xl px-4 py-2.5">
          <span className="text-xl">✨</span>
          <div>
            <div className="text-xs font-bold text-fuchsia-700">Gen.{optis.generation} — 転生済み</div>
            <div className="text-[11px] text-fuchsia-500">EXP×{generationBonus(optis.generation).expMultiplier.toFixed(1)} / ダークウェブ解放: {generationBonus(optis.generation).darkWebHour}:00〜</div>
          </div>
        </div>
      )}

      {/* ローン返済バナー */}
      {optis.activeLoan && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-xl px-4 py-2.5">
          <span className="text-xl">💳</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-red-700">ローン返済中: {optis.activeLoan.purpose}</div>
            <div className="text-[11px] text-red-500">残り{optis.activeLoan.remaining}回 × {optis.activeLoan.monthlyPayment.toLocaleString()}円/月</div>
          </div>
          <div className="text-xs font-extrabold text-red-600">{optis.activeLoan.paidMonths}/{optis.activeLoan.months}ヶ月</div>
        </div>
      )}

      {/* 結晶化メッセージ */}
      {crystalMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-fuchsia-900 text-fuchsia-100 text-sm px-4 py-2.5 rounded-full shadow-lg font-medium text-center max-w-xs">
          {crystalMsg}
        </div>
      )}

      {/* 進行中プロジェクトバナー */}
      {activeProject && (
        <Link href="/projects" className="block bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🎯</span>
            <span className="text-xs font-bold text-gray-700 truncate">{activeProject.name}</span>
            <span className="ml-auto text-xs font-extrabold text-emerald-600">{activeProject.progressPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${activeProject.progressPct}%` }} />
          </div>
          {(activeProject as ActiveProject & { pendingBoostCount?: number }).pendingBoostCount ? (
            <div className="text-[11px] text-blue-600 font-medium mt-1">⚡ 親ブーストを申請できます！</div>
          ) : (
            <div className="text-[11px] text-gray-400 mt-1">あと {formatJPY(activeProject.remaining)}</div>
          )}
        </Link>
      )}

      {/* 週宝箱 */}
      <ChestBanner onClaimed={fetchAll} />

      {/* ミッション受信箱 */}
      <MissionInbox onChanged={fetchAll} />

      {/* Optis ステージ */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 flex flex-col items-center"
        style={{ background: `radial-gradient(circle at 50% 30%, ${meta.color}22, #0f172a 80%)` }}
      >
        {/* 吹き出し */}
        {bubble && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white text-gray-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg z-10 whitespace-nowrap max-w-[90%] text-center">
            {bubble}
          </div>
        )}
        {/* EXP獲得ポップ */}
        {expPop != null && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 exp-pop text-yellow-300 font-bold text-lg">
            +{expPop} EXP
          </div>
        )}

        <button onClick={handleTap} className="active:scale-95 transition-transform" aria-label="Optisにタッチ">
          <OptisCreature
            form={optis.form}
            stage={optis.stage}
            auraId={optis.equippedAura}
            accessoryId={optis.equippedAccessory}
            animClass={anim}
            frozen={optis.frozen}
            size={220}
            awakeningTier={optis.awakeningTier ?? 0}
            onCorePointerDown={coreDown}
            onCorePointerUp={coreUp}
          />
        </button>

        <div className="text-center mt-2">
          <div className="text-white font-bold">{STAGE_LABEL[optis.stage]} ・ Lv.{optis.level}</div>
          <div className="text-xs mt-0.5" style={{ color: meta.accent }}>{meta.label}</div>
        </div>

        {/* EXPバー */}
        <div className="w-full mt-3">
          <div className="flex justify-between text-[10px] text-gray-300 mb-1">
            <span>EXP</span>
            <span>{optis.intoLevel} / {optis.needed}</span>
          </div>
          <div className="h-2 bg-white/15 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${expPct}%`, background: `linear-gradient(90deg,${meta.color},${meta.accent})` }} />
          </div>
        </div>

        {/* メモリーキューブ棚 */}
        {optis.crystalCount > 0 && (
          <div className="w-full mt-3">
            <div className="text-[10px] text-center mb-1.5" style={{ color: meta.accent }}>— メモリーキューブ —</div>
            <div className="flex gap-2 justify-center flex-wrap">
              {Array.from({ length: optis.crystalCount }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border" style={{ background: `${meta.color}30`, borderColor: `${meta.color}60`, color: meta.accent }}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 転生ボタン */}
        {optis.stage >= CRYSTALLIZE_MIN_STAGE && optis.level >= CRYSTALLIZE_MIN_LEVEL && !optis.frozen && (
          <button
            onClick={crystallize}
            disabled={crystalizing}
            className="mt-3 px-5 py-2 rounded-full text-xs font-bold border animate-pulse disabled:opacity-40"
            style={{ background: `${meta.color}20`, borderColor: meta.color, color: meta.accent }}
          >
            {crystalizing ? "結晶化中…" : "✨ 転生する（メモリーキューブ化）"}
          </button>
        )}

        {optis.frozen && (
          <div className="mt-3 text-xs text-red-300 bg-red-500/20 px-3 py-1.5 rounded-lg text-center">
            ⚠️ 不正検知によりステータス凍結中。反応・経験値が停止しています。
          </div>
        )}
        {isDarkWebHour() && !optis.frozen && (
          <div className="mt-2 text-[10px] text-cyan-300/70 neon-flicker">コアを3秒長押し…？</div>
        )}
      </div>

      {/* Needs/Wants 14日バランス */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span className="text-blue-600 font-medium">Needs {optis.needsRatio}%</span>
          <span className="text-gray-400">直近14日の仕分け</span>
          <span className="text-pink-600 font-medium">Wants {optis.wantsRatio}%</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden flex">
          <div style={{ width: `${optis.needsRatio}%`, background: "#3b82f6" }} />
          <div style={{ width: `${optis.wantsRatio}%`, background: "#ec4899" }} />
        </div>
      </div>

      {/* 導線 */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/tasks" className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-3 hover:border-blue-300">
          <span className="text-2xl">🧹</span>
          <div className="min-w-0">
            <div className="font-medium text-gray-800 text-sm">お手伝い</div>
            <div className="text-[11px] text-gray-500">稼ぐ</div>
          </div>
        </Link>
        <Link href="/collection" className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-3 hover:border-blue-300">
          <span className="text-2xl">📒</span>
          <div className="min-w-0">
            <div className="font-medium text-gray-800 text-sm">パーツ図鑑</div>
            <div className="text-[11px] text-gray-500">集める・装備</div>
          </div>
        </Link>
        {!optis.activeLoan && (
          <button
            onClick={() => setShowLoanForm(true)}
            className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-3 hover:border-red-300 text-left"
          >
            <span className="text-2xl">💳</span>
            <div className="min-w-0">
              <div className="font-medium text-gray-800 text-sm">ローン申請</div>
              <div className="text-[11px] text-gray-500">前借り・返済計画</div>
            </div>
          </button>
        )}
      </div>

      {/* 浮遊入力ボタン */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-5 z-30 w-16 h-16 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform"
        style={{ boxShadow: `0 8px 24px ${meta.color}66` }}
        aria-label="記録する"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {showRoulette && <RouletteModal onClose={() => { setShowRoulette(false); fetchAll(); }} />}

      {/* ローン申請モーダル */}
      {showLoanForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm sm:rounded-2xl rounded-t-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <h2 className="text-lg font-bold text-gray-800">ローン申請</h2>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
              借りたお金は毎月のお小遣いから返済します。返済が終わると信用スコアが大幅UPします。
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">何に使うか</label>
              <input
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                placeholder="例: 塾用のバッグ、部活の道具"
                value={loanForm.purpose}
                onChange={e => setLoanForm({ ...loanForm, purpose: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">借りたい金額(円)</label>
              <input
                type="number"
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                placeholder="5000"
                value={loanForm.principal}
                onChange={e => setLoanForm({ ...loanForm, principal: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">返済期間</label>
              <select
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                value={loanForm.months}
                onChange={e => setLoanForm({ ...loanForm, months: e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6].map(m => (
                  <option key={m} value={m}>{m}ヶ月
                    {loanForm.principal ? ` (月 ${Math.ceil(Number(loanForm.principal) / m).toLocaleString()}円〜)` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLoanForm(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 font-semibold">
                キャンセル
              </button>
              <button
                onClick={requestLoan}
                disabled={loanSaving || !loanForm.purpose.trim() || !loanForm.principal}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 font-semibold disabled:opacity-40"
              >
                {loanSaving ? "申請中…" : "申請する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 進化・変身カットイン */}
      {evolution && (
        <EvolutionCutin
          fromForm={evolution.fromForm}
          fromStage={evolution.fromStage}
          toForm={evolution.toForm}
          toStage={evolution.toStage}
          auraId={optis.equippedAura}
          accessoryId={optis.equippedAccessory}
          onClose={closeEvolution}
        />
      )}

      {/* NMDダイアログ */}
      {nmdAsk && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="text-3xl mb-2">🌙</div>
            <h2 className="font-bold text-gray-800">放課後チェック</h2>
            <p className="text-sm text-gray-600 mt-2">16:00〜19:00の間に支出はあった？</p>
            <p className="text-xs text-gray-400 mt-1">「なかった」を選ぶと明日のルーレットが確変に！<br />※あとから支出を足すと不正検知で凍結されるよ</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => answerNmd(true)} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold">なかった</button>
              <button onClick={() => answerNmd(false)} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-semibold">あった</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
