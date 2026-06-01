"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { formatJPY } from "@/lib/dateUtils";
import { OptisForm, FORM_META, STAGE_LABEL, randomMotion, isDarkWebHour } from "@/lib/optis";
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
  archive: { resistedTotal: number; items: { id: number; amount: number; date: string; memo: string | null }[] };
}

interface Balance { wallet: number; free: number; saved: number; }
interface GoalSummary { id: number; name: string; progress: number; saved: number; targetAmount: number; remaining: number; isAchieved: boolean; }

export default function OptisLabPage() {
  const [optis, setOptis] = useState<OptisData | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [topGoal, setTopGoal] = useState<GoalSummary | null>(null);
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
    const [o, b, goals] = await Promise.all([
      fetch("/api/optis").then(r => r.json()),
      fetch("/api/balance").then(r => r.json()),
      fetch("/api/goals").then(r => r.json()),
    ]);
    setOptis(o);
    setBalance(b);
    const active = (goals as GoalSummary[]).filter(g => !g.isAchieved);
    setTopGoal(active.length > 0 ? active[0] : null);
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
    const m = randomMotion();
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

  async function handleSaved(info: { expGain: number }) {
    setShowAdd(false);
    if (info.expGain > 0) {
      setExpPop(info.expGain);
      playExpGain();
      setTimeout(() => setExpPop(null), 1100);
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

  return (
    <div className="space-y-4 relative">
      {/* グリッチ遷移フラッシュ */}
      {glitch && <div className="fixed inset-0 z-[80] bg-cyan-400 glitch-flash pointer-events-none" />}

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
