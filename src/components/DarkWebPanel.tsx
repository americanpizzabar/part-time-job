"use client";

import { useEffect, useState, useRef } from "react";
import { formatJPY } from "@/lib/dateUtils";
import { PARTS, RARITY_META, Part, BRAIN_META, BrainType, FEED_CATEGORY_META, marketSellPrice, ASSET_META, WEATHER_META, WeatherType, creditRank, PartEffect, GCOIN_BANK_RATE, MARKET_SELL_FEE, generationBonus, DarkRepRank } from "@/lib/optis";
import type { MissionType } from "@/lib/dailyMissions";
import GuildPanel from "@/components/GuildPanel";
import CodeRain from "@/components/CodeRain";

interface DarkWebPanelProps {
  optis: { level: number; intoLevel: number; needed: number; experience: number; creditScore: number; gcoins?: number; wisdomPoints?: number; generation?: number; langMode?: string; hasQuizShield?: boolean };
  onExit: () => void;
  onChanged: () => void;
}

interface ForecastData {
  wisdomPoints: number;
  cost: number;
  purchased: boolean;
  upcoming: { type: WeatherType; magnitude: number; meta: { label: string; emoji: string; color: string; desc: string }; effectiveMultiplier: number } | null;
}

interface FullState {
  equippedAura: string;
  equippedAccessory: string | null;
  equippedBody: string;
  unlocked: string[];
  gcoins: number;
  generation: number;
  langMode: string;
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
  totalBought: number; totalSold: number; unrealizedPnl: number | null;
}

interface MarketTrade {
  id: number; partId: string; action: string; price: number; date: string;
}

interface MarketData {
  listings: MarketListing[];
  gcoins: number;
  activeWeather: { type: string; description: string } | null;
  weatherMultiplier: number;
  hasShield: boolean;
  buyDiscount?: number;
  discountSource?: "trader" | "credit" | null;
  rank?: { tier: number; label: string; marketDiscount: number };
  awakeningTier?: number;
  sellFee?: number;
  realizedPnl?: number;
  recentTrades?: MarketTrade[];
}

interface FeedItem {
  id: number; title: string; body: string; category: string;
  effectJson: string | null; isActive: boolean; publishedAt: string;
}

interface CareerData {
  categories: { name: string; total: number; pct: number }[];
  total: number;
  topCategory: string | null;
}

interface FundData {
  id: number; invested: number; currentValue: number;
  parentMatchRate: number; baseReturnRate: number; lastReturnAt: string | null;
  growthAmount: number; growthPct: number;
  recentTxs: { id: number; amount: number; type: string; date: string; memo: string | null }[];
}

interface QuizStatus {
  quiz: { id: number; question: string; weatherType: string } | null;
  hasShield: boolean;
  shieldUntil: string | null;
  answeredToday: boolean;
  lastAnswered: { correct: boolean; createdAt: string } | null;
}

type Tab = "matrix" | "decode" | "oracle" | "market" | "quiz" | "brain" | "feed" | "bank" | "fund" | "guild" | "ghost" | "core" | "junk" | "deal" | "closet" | "status";

// ハッカーREP + 闇取引のレスポンス型
interface DarkRepData {
  rep: number;
  rank: DarkRepRank;
  next: { rank: DarkRepRank; remaining: number } | null;
  breakdown: { label: string; count: number; rep: number }[];
  blackDealUnlocked: boolean;
  blackDealMinRep: number;
}
interface BlackDealData {
  locked: boolean;
  rep: number;
  minRep?: number;
  rank: DarkRepRank;
  deal?: {
    date: string;
    part: { id: string; name: string; emoji: string; rarity: string } | null;
    price: number;
    basePrice: number;
    discountPct: number;
    inspected: boolean;
    legit: boolean | null;
    outcome: string | null;
    inspectCost: number;
    gcoins: number;
  };
}

interface GhostData {
  weekKey: string;
  ghost: { name: string; level: number; brainType: string; brainLabel: string; brainEmoji: string; targetScore: number; progress: number; defeated: boolean };
  me: { level: number; score: number; budgetScore: number; quizScore: number };
  rewardPart: { id: string; name: string; emoji: string; rarity: string; owned: boolean } | null;
  canClaim: boolean;
  isWeekend: boolean;
}
interface MainframeData {
  cycleKey: string;
  unlocked: boolean;
  minLevel: number;
  level: number;
  solved: boolean;
  problem: { question: string; options: string[]; explanation: string | null };
  titlePart: { id: string; name: string; emoji: string; rarity: string; owned: boolean } | null;
}
interface JunkData {
  rawData: number;
  craftCost: number;
  canCraft: boolean;
  disassemblable: { id: string; name: string; emoji: string; rarity: string; raw: number }[];
  craftPool: { id: string; name: string; emoji: string; rarity: string; owned: boolean; vocab: { word: string; meaning: string } | null }[];
}

interface DecodeMission {
  id: number; kind: "DATA" | "ALGO"; title: string; brief: string;
  dataset: string | null; question: string; choices: string[];
  explanation: string | null; expReward: number; gcoinReward: number;
  rewardPartId: string | null; solvedAt: string | null;
}

interface LearningInfo {
  layer: number; layerLabel: string;
  parentAlertAt: string | null; parentBoosted: boolean;
}

interface DropStatus { windowOpen: boolean; claimedToday: boolean; dropHour: number; }

function calcPriceHack(nowPrice: number, waitMonths: number, dropPct: number) {
  const future = Math.round(nowPrice * (1 - dropPct / 100));
  return { future, saved: nowPrice - future };
}

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

function FundSparkline({ txs, color }: { txs: { amount: number; type: string }[]; color: string }) {
  if (txs.length < 2) return <span className="text-[10px] text-cyan-800">—</span>;
  const values: number[] = [];
  let running = 0;
  for (const tx of [...txs].reverse()) {
    if (tx.type === "INVEST" || tx.type === "RETURN" || tx.type === "PARENT_BONUS") running += tx.amount;
    else if (tx.type === "WITHDRAW") running = Math.max(0, running - tx.amount);
    values.push(running);
  }
  return <Sparkline prices={values} color={color} />;
}

export default function DarkWebPanel({ optis, onExit, onChanged }: DarkWebPanelProps) {
  const [state, setState] = useState<FullState | null>(null);
  const [sim, setSim] = useState<SimData | null>(null);
  const [brain, setBrain] = useState<BrainData | null>(null);
  const [bankData, setBankData] = useState<{ gcoins: number; deposits: BankDeposit[] } | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [career, setCareer] = useState<CareerData | null>(null);
  const [fund, setFund] = useState<FundData | null>(null);
  const [quizStatus, setQuizStatus] = useState<QuizStatus | null>(null);
  const [tab, setTab] = useState<Tab>("matrix");
  const [depositAmt, setDepositAmt] = useState("");
  const [depositMsg, setDepositMsg] = useState("");
  const [marketMsg, setMarketMsg] = useState("");
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [partHistory, setPartHistory] = useState<{ date: string; price: number }[]>([]);
  const [phNow, setPhNow] = useState("");
  const [phMonths, setPhMonths] = useState("3");
  const [phDrop, setPhDrop] = useState("30");
  const [fundInvestAmt, setFundInvestAmt] = useState("");
  const [fundWithdrawAmt, setFundWithdrawAmt] = useState("");
  const [fundMsg, setFundMsg] = useState("");
  const [langMsg, setLangMsg] = useState("");
  const [missions, setMissions] = useState<{id:number;word:string;translation:string;choices:string[];hint:string;expReward:number;isActive:boolean;solvedAt:string|null}[]>([]);
  const [missionResult, setMissionResult] = useState<{id:number;correct:boolean;word:string;translation:string} | null>(null);
  // ORACLE (神託) — 総資産 & 未来予測
  const [balance, setBalance] = useState<{ wallet: number; free: number; saved: number } | null>(null);
  const [mercari, setMercari] = useState<{ total: number } | null>(null);
  const [projMonthly, setProjMonthly] = useState("2000");
  const [projYears, setProjYears] = useState("10");
  // INTEL BROKER (経済予報)
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [forecastMsg, setForecastMsg] = useState("");
  // DECODE (データ解読)
  const [decode, setDecode] = useState<DecodeMission[]>([]);
  const [decodeResult, setDecodeResult] = useState<{ id: number; correct: boolean; explanation: string; expGained?: number; gcoinGained?: number; unlockedPart?: { name: string; emoji?: string } | null } | null>(null);
  // DARK CHARGE (匿名スポンサー = 親ブースト)
  const [learning, setLearning] = useState<LearningInfo | null>(null);
  // GUILD DAILY MISSIONS
  const [guildMissions, setGuildMissions] = useState<{ type: MissionType; title: string; desc: string; reward: { exp: number; gcoins: number }; brainTag: BrainType; completed: boolean; claimed: boolean }[]>([]);
  const [guildMsg, setGuildMsg] = useState("");
  // SECRET DROP (23:00 ゲリラ)
  const [ghost, setGhost] = useState<GhostData | null>(null);
  const [ghostMsg, setGhostMsg] = useState("");
  const [ghostWin, setGhostWin] = useState<{ name: string; emoji: string } | null>(null);
  const [mainframe, setMainframe] = useState<MainframeData | null>(null);
  const [mfSelected, setMfSelected] = useState<number | null>(null);
  const [mfResult, setMfResult] = useState<{ correct: boolean; explanation: string; newPart: boolean } | null>(null);
  const [mfHackOverlay, setMfHackOverlay] = useState(false);
  const [junk, setJunk] = useState<JunkData | null>(null);
  const [darkRep, setDarkRep] = useState<DarkRepData | null>(null);
  const [blackDeal, setBlackDeal] = useState<BlackDealData | null>(null);
  const [dealMsg, setDealMsg] = useState("");
  const [dealBusy, setDealBusy] = useState(false);
  const [dealResult, setDealResult] = useState<{ outcome: string; lesson: string; jackpot?: number; rawDataGained?: number } | null>(null);
  const [junkMsg, setJunkMsg] = useState("");
  const [craftResult, setCraftResult] = useState<{ name: string; emoji: string; vocab: { word: string; meaning: string } | null } | null>(null);
  const [drop, setDrop] = useState<DropStatus | null>(null);
  const [dropOverlay, setDropOverlay] = useState(false);
  const [dropCountdown, setDropCountdown] = useState(60);
  const [dropReward, setDropReward] = useState<{ expGained: number; gcoinGained: number; label: string; unlockedPart?: { name: string; emoji?: string } | null } | null>(null);
  const dropSeenRef = useRef(false);

  const load = () => {
    fetch("/api/optis").then(r => r.json()).then(setState);
    fetch("/api/simulator").then(r => r.json()).then(setSim);
    fetch("/api/brain").then(r => r.json()).then(setBrain);
    fetch("/api/bank").then(r => r.json()).then(setBankData);
    fetch("/api/market").then(r => r.json()).then(setMarket);
    fetch("/api/feed").then(r => r.json()).then(setFeed);
    fetch("/api/career").then(r => r.json()).then(setCareer);
    fetch("/api/fund").then(r => r.json()).then(setFund);
    fetch("/api/quiz").then(r => r.json()).then(setQuizStatus);
    fetch("/api/wordmission").then(r => r.json()).then(setMissions).catch(() => {});
    fetch("/api/balance").then(r => r.json()).then(setBalance).catch(() => {});
    fetch("/api/mercari").then(r => r.json()).then(setMercari).catch(() => {});
    fetch("/api/decode").then(r => r.json()).then(d => setDecode(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/learning").then(r => r.json()).then(setLearning).catch(() => {});
    fetch("/api/drop").then(r => r.json()).then(setDrop).catch(() => {});
    fetch("/api/forecast").then(r => r.json()).then(setForecast).catch(() => {});
    fetch("/api/guild/daily").then(r => r.json()).then(d => setGuildMissions(d?.missions ?? [])).catch(() => {});
    fetch("/api/ghost").then(r => r.json()).then(setGhost).catch(() => {});
    fetch("/api/mainframe").then(r => r.json()).then(setMainframe).catch(() => {});
    fetch("/api/junk").then(r => r.json()).then(setJunk).catch(() => {});
    fetch("/api/darkrep").then(r => r.json()).then(setDarkRep).catch(() => {});
    fetch("/api/blackdeal").then(r => r.json()).then(setBlackDeal).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  // シークレット・ドロップ: 23:00台かつ未回収なら一度だけゲリラ・ウィンドウを開く
  useEffect(() => {
    if (drop?.windowOpen && !drop.claimedToday && !dropSeenRef.current) {
      dropSeenRef.current = true;
      setDropOverlay(true);
      setDropCountdown(60);
    }
  }, [drop]);

  // 60秒カウントダウン(0で自動的に閉じる)
  useEffect(() => {
    if (!dropOverlay || dropReward) return;
    const iv = setInterval(() => {
      setDropCountdown(c => {
        if (c <= 1) {
          clearInterval(iv);
          setDropOverlay(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [dropOverlay, dropReward]);

  async function claimDrop() {
    const r = await fetch("/api/drop", { method: "POST" });
    const data = await r.json();
    if (r.ok) {
      setDropReward({ expGained: data.expGained, gcoinGained: data.gcoinGained, label: data.label, unlockedPart: data.unlockedPart });
      load(); onChanged();
      // 回収したら即終了・自動ログアウト
      setTimeout(() => { setDropOverlay(false); setDropReward(null); onExit(); }, 2800);
    } else {
      setDropOverlay(false);
    }
  }

  async function buyForecast() {
    const r = await fetch("/api/forecast", { method: "POST" });
    const data = await r.json();
    if (r.ok) {
      setForecastMsg("");
      fetch("/api/forecast").then(r => r.json()).then(setForecast).catch(() => {});
      fetch("/api/market").then(r => r.json()).then(setMarket).catch(() => {});
      load();
      onChanged();
    } else {
      setForecastMsg(data.error ?? "予報の購入に失敗しました");
      setTimeout(() => setForecastMsg(""), 3000);
    }
  }

  async function claimMission(type: MissionType) {
    const r = await fetch("/api/guild/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = await r.json();
    if (data.ok) {
      setGuildMsg(`+${data.reward.exp} EXP / +${data.reward.gcoins}G 獲得！`);
      fetch("/api/guild/daily").then(r => r.json()).then(d => setGuildMissions(d?.missions ?? []));
      onChanged();
    } else {
      setGuildMsg(data.error ?? "エラー");
    }
    setTimeout(() => setGuildMsg(""), 3000);
  }

  async function answerDecode(mission: DecodeMission, index: number) {
    const r = await fetch(`/api/decode/${mission.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedIndex: index }),
    });
    const data = await r.json();
    setDecodeResult({
      id: mission.id, correct: data.correct, explanation: data.explanation,
      expGained: data.expGained, gcoinGained: data.gcoinGained, unlockedPart: data.unlockedPart,
    });
    if (data.correct) {
      load(); onChanged();
      setTimeout(() => setDecodeResult(null), 3200);
    } else {
      setTimeout(() => setDecodeResult(null), 2600);
    }
  }

  async function equip(part: Part) {
    await fetch("/api/optis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partId: part.id, type: part.type }),
    });
    load(); onChanged();
  }

  async function claimGhost() {
    const r = await fetch("/api/ghost", { method: "POST" });
    const data = await r.json();
    if (r.ok && data.ok) {
      if (data.part) setGhostWin({ name: data.part.name, emoji: data.part.emoji });
      load(); onChanged();
      setTimeout(() => setGhostWin(null), 3500);
    } else {
      setGhostMsg(data.error ?? "略奪に失敗しました");
      setTimeout(() => setGhostMsg(""), 3000);
    }
  }

  async function solveMainframe() {
    if (mfSelected === null) return;
    const r = await fetch("/api/mainframe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedIndex: mfSelected }),
    });
    const data = await r.json();
    if (r.ok) {
      setMfResult({ correct: data.correct, explanation: data.explanation, newPart: data.newPart });
      if (data.correct) {
        setMfHackOverlay(true);
        setTimeout(() => setMfHackOverlay(false), 2600);
        load(); onChanged();
      }
    } else {
      setMfResult({ correct: !!data.correct, explanation: data.error ?? "エラー", newPart: false });
    }
  }

  async function disassemble(partId: string) {
    const r = await fetch("/api/junk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disassemble", partId }),
    });
    const data = await r.json();
    if (r.ok) {
      setJunkMsg(`+${data.gained} 生データを回収`);
      fetch("/api/junk").then(r => r.json()).then(setJunk).catch(() => {});
      onChanged();
    } else {
      setJunkMsg(data.error ?? "分解に失敗しました");
    }
    setTimeout(() => setJunkMsg(""), 2600);
  }

  async function craft() {
    const r = await fetch("/api/junk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "craft" }),
    });
    const data = await r.json();
    if (r.ok && data.part) {
      setCraftResult({ name: data.part.name, emoji: data.part.emoji, vocab: data.part.vocab });
      fetch("/api/junk").then(r => r.json()).then(setJunk).catch(() => {});
      onChanged();
      setTimeout(() => setCraftResult(null), 4000);
    } else {
      setJunkMsg(data.error ?? "合成に失敗しました");
      setTimeout(() => setJunkMsg(""), 2600);
    }
  }

  // 闇取引: 鑑定 or 購入
  async function dealAction(action: "inspect" | "buy") {
    if (dealBusy) return;
    setDealBusy(true);
    try {
      const r = await fetch("/api/blackdeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await r.json();
      if (!r.ok) {
        setDealMsg(data.error ?? "取引に失敗した");
        setTimeout(() => setDealMsg(""), 3000);
        return;
      }
      if (action === "inspect") {
        setDealMsg(data.message ?? "");
        setTimeout(() => setDealMsg(""), 6000);
      } else {
        setDealResult({ outcome: data.outcome, lesson: data.lesson, jackpot: data.jackpot, rawDataGained: data.rawDataGained });
      }
      fetch("/api/blackdeal").then(r => r.json()).then(setBlackDeal).catch(() => {});
      fetch("/api/optis").then(r => r.json()).then(setState);
      onChanged();
    } finally {
      setDealBusy(false);
    }
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
    setDepositMsg(r.ok ? `✅ ${amt}G を預け入れました。満期 +${Math.round(amt * GCOIN_BANK_RATE)}G` : data.error);
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

  async function fundInvest() {
    const amt = Number(fundInvestAmt);
    if (!amt || amt <= 0) return;
    const r = await fetch("/api/fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amt }),
    });
    const data = await r.json();
    setFundMsg(r.ok ? `✅ ${formatJPY(amt)} を投資しました` : `❌ ${data.error}`);
    setFundInvestAmt("");
    fetch("/api/fund").then(r => r.json()).then(setFund);
    onChanged();
  }

  async function fundWithdrawAction() {
    const amt = Number(fundWithdrawAmt);
    if (!amt || amt <= 0) return;
    const r = await fetch("/api/fund/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amt }),
    });
    const data = await r.json();
    setFundMsg(r.ok ? `💸 ${formatJPY(amt)} を引き出しました` : `❌ ${data.error}`);
    setFundWithdrawAmt("");
    fetch("/api/fund").then(r => r.json()).then(setFund);
    onChanged();
  }

  async function toggleLang() {
    const currentLang = state?.langMode ?? "JA";
    const newLang = currentLang === "JA" ? "EN" : "JA";
    const r = await fetch("/api/optis/lang", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ langMode: newLang }),
    });
    const data = await r.json();
    if (r.ok) {
      setLangMsg(newLang === "EN" ? "🌏 英語モード ON! EXP×1.5" : "🇯🇵 日本語モードに切り替えました");
      fetch("/api/optis").then(r => r.json()).then(setState);
      onChanged();
    } else {
      setLangMsg(`❌ ${data.error}`);
    }
    setTimeout(() => setLangMsg(""), 3000);
  }

  const expRemain = optis.needed - optis.intoLevel;
  const gcoins = state?.gcoins ?? optis.gcoins ?? 0;
  const generation = state?.generation ?? optis.generation ?? 1;
  const langMode = state?.langMode ?? optis.langMode ?? "JA";
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
    ["matrix", "MATRIX"], ["decode", "DECODE"], ["oracle", "ORACLE"], ["market", "MARKET"], ["quiz", "QUIZ"],
    ["brain", "BRAIN"], ["feed", "FEED"], ["bank", "BANK"], ["fund", "FUND"], ["guild", "GUILD"],
    ["ghost", "GHOST"], ["core", "CORE"], ["junk", "JUNK"], ["deal", "DEAL"], ["closet", "CLOSET"],
    ["status", "STATUS"],
  ];

  const decodePending = decode.filter(m => !m.solvedAt).length;
  const darkChargePending = !!(learning?.parentAlertAt && !learning.parentBoosted);
  const guildClaimable = guildMissions.filter(m => m.completed && !m.claimed).length;
  const ghostClaimable = !!(ghost?.canClaim && !ghost.ghost.defeated);
  const mainframeReady = !!(mainframe?.unlocked && !mainframe.solved);
  const junkCraftable = !!junk?.canCraft;
  const dealPending = !!(blackDeal && !blackDeal.locked && blackDeal.deal && !blackDeal.deal.outcome);

  // ── ORACLE 計算: 総資産(リアルマネー=円) & 複利による未来予測 ──
  // 注: 銀行預金は G-COIN(ゲーム内通貨)なので円の総資産には合算しない
  const cash = balance?.wallet ?? 0;
  const fundValue = fund?.currentValue ?? 0;
  const mercariTotal = mercari?.total ?? 0;
  const netWorth = cash + fundValue;
  const netWorthParts = [
    { label: "現金(財布)", value: cash, color: "#22d3ee" },
    { label: "ファンド評価額", value: fundValue, color: "#818cf8" },
  ].filter(p => p.value > 0);

  const projAnnualRate = fund?.baseReturnRate ?? 5;
  const projMonths = Math.max(0, Math.min(50, Number(projYears) || 0)) * 12;
  const projMonthlyAmt = Math.max(0, Number(projMonthly) || 0);
  const monthlyRate = projAnnualRate / 100 / 12;
  const yearlyValues: number[] = [];
  let projVal = netWorth;
  for (let m = 1; m <= projMonths; m++) {
    projVal = projVal * (1 + monthlyRate) + projMonthlyAmt;
    if (m % 12 === 0) yearlyValues.push(Math.round(projVal));
  }
  const projFuture = Math.round(projVal);
  const projContributed = netWorth + projMonthlyAmt * projMonths;
  const projGrowth = Math.max(0, projFuture - projContributed);

  const buyable = market?.listings.filter(l => !l.owned).sort((a, b) => a.currentPrice - b.currentPrice) ?? [];
  const sellable = market?.listings.filter(l => l.owned && !l.equipped) ?? [];

  const daysUntilReturn = (() => {
    if (!fund?.lastReturnAt) return null;
    const last = new Date(fund.lastReturnAt);
    const next = new Date(last.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diff = Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  })();

  return (
    <div className="fixed inset-0 z-[70] dark-web dark-web-grid overflow-y-auto">
      <CodeRain color="#22c55e" opacity={0.16} />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-28">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold neon-flicker tracking-widest" style={{ textShadow: "0 0 8px #22d3ee" }}>
              ◢ DARK WEB MODE ◣
            </h1>
            {generation > 1 && (
              <div className="text-[10px] text-fuchsia-400 font-mono mt-0.5">
                ◈ GENERATION {generation} — 転生ボーナス +{Math.round((generationBonus(generation).expMultiplier - 1) * 100)}% EXP
              </div>
            )}
            {darkRep && (
              <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">
                {darkRep.rank.emoji} {darkRep.rank.name} — REP {darkRep.rep}
              </div>
            )}
          </div>
          <button onClick={onExit} className="text-cyan-300 border border-cyan-500/50 rounded-lg px-3 py-1 text-xs">EXIT ▸</button>
        </div>

        {/* 15タブ (3行×5列) */}
        <div className="grid grid-cols-5 gap-1 mb-5">
          {TABS.map(([t, l]) => {
            const dot = (t === "decode" && decodePending > 0) || (t === "status" && darkChargePending) || (t === "guild" && guildClaimable > 0)
              || (t === "ghost" && ghostClaimable) || (t === "core" && mainframeReady) || (t === "junk" && junkCraftable)
              || (t === "deal" && dealPending);
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`relative py-1.5 text-[9px] font-mono rounded border transition-colors ${tab === t ? "bg-cyan-900/60 border-cyan-400 text-cyan-200" : "border-cyan-900/40 text-cyan-700 hover:text-cyan-500"}`}>
                {l}
                {dot && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
            );
          })}
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

        {/* ── DECODE ───────────────────────────────────────────── */}
        {tab === "decode" && (
          <div className="space-y-3">
            <div className="border border-emerald-500/40 rounded-xl p-4 bg-black/50">
              <div className="text-[11px] text-emerald-400 tracking-widest mb-1">// DATA_DECODE — インテリジェンス暗号解読</div>
              <div className="text-[10px] text-emerald-700 leading-relaxed">
                入手した極秘データ(統計・グラフ)とシステムの疑似コードを解析せよ。
                正解で EXP + G-COIN、初回解読で限定の<span className="text-emerald-400">バグパーツ</span>を回収できる。
              </div>
              <div className="text-[10px] text-emerald-600 font-mono mt-2">
                SOLVED: {decode.filter(m => m.solvedAt).length} / {decode.length}
              </div>
            </div>

            {decode.length === 0 ? (
              <div className="text-emerald-700 text-xs font-mono text-center py-4 border border-emerald-900/30 rounded-xl">
                データを受信中…
              </div>
            ) : (
              decode.map(m => {
                const solved = !!m.solvedAt;
                const isResult = decodeResult?.id === m.id;
                const kindMeta = m.kind === "DATA"
                  ? { label: "DATA // 統計・グラフ読解", color: "#34d399" }
                  : { label: "ALGO // 疑似コード解析", color: "#22d3ee" };
                return (
                  <div key={m.id} className="border rounded-xl p-4 bg-black/50" style={{ borderColor: `${kindMeta.color}40` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${kindMeta.color}20`, color: kindMeta.color }}>
                        {kindMeta.label}
                      </span>
                      {solved && <span className="ml-auto text-[9px] text-emerald-500 font-mono">✓ DECODED</span>}
                    </div>
                    <div className="text-emerald-200 text-xs font-bold mb-1">{m.title}</div>
                    <div className="text-[11px] text-emerald-300/70 mb-2 leading-relaxed">{m.brief}</div>

                    {m.dataset && (
                      <pre className="text-[11px] text-emerald-300 bg-black/60 border border-emerald-900/40 rounded-lg p-2.5 mb-2 overflow-x-auto whitespace-pre font-mono leading-relaxed">
{m.dataset}
                      </pre>
                    )}

                    <div className="text-emerald-100 text-xs mb-2 font-mono">Q: {m.question}</div>

                    {isResult ? (
                      <div className={`rounded-lg p-3 text-xs font-mono ${decodeResult!.correct ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40" : "bg-red-900/40 text-red-300 border border-red-700/40"}`}>
                        {decodeResult!.correct ? (
                          <>
                            <div className="font-bold mb-1">✅ デコード成功！</div>
                            {(decodeResult!.expGained ?? 0) > 0 && (
                              <div className="text-emerald-400">+{decodeResult!.expGained} EXP / +{decodeResult!.gcoinGained} G</div>
                            )}
                            {decodeResult!.unlockedPart && (
                              <div className="text-yellow-300 mt-0.5">🧬 バグパーツ解放: {decodeResult!.unlockedPart.emoji} {decodeResult!.unlockedPart.name}</div>
                            )}
                            <div className="text-emerald-200/70 mt-1.5 leading-relaxed">{decodeResult!.explanation}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-bold mb-1">❌ 解析失敗。もう一度。</div>
                            <div className="text-red-200/70 leading-relaxed">{decodeResult!.explanation}</div>
                          </>
                        )}
                      </div>
                    ) : solved ? (
                      <div className="text-[11px] text-emerald-600/80 font-mono bg-black/30 rounded-lg p-2 leading-relaxed">
                        {m.explanation}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {m.choices.map((choice, i) => (
                          <button
                            key={i}
                            onClick={() => answerDecode(m, i)}
                            className="w-full text-left text-xs font-mono text-emerald-200 bg-black/40 hover:bg-emerald-900/30 border border-emerald-900/40 hover:border-emerald-600/50 rounded-lg px-3 py-2 transition-colors"
                          >
                            <span className="text-emerald-600 mr-2">{String.fromCharCode(65 + i)} ▸</span>{choice}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── ORACLE ───────────────────────────────────────────── */}
        {tab === "oracle" && (
          <div className="space-y-4">
            {/* 総資産 */}
            <div className="border border-cyan-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-cyan-500 tracking-widest mb-1">// NET_WORTH — 総資産スキャン</div>
              <div className="text-[10px] text-cyan-700 mb-3">現金・ファンド・銀行を合算したリアルマネー総額</div>
              <div className="text-center mb-4">
                <div className="text-cyan-600 text-[10px] tracking-widest">TOTAL ASSETS</div>
                <div className="text-cyan-200 text-4xl font-black" style={{ textShadow: "0 0 12px #22d3ee" }}>
                  {formatJPY(netWorth)}
                </div>
              </div>
              {netWorthParts.length > 0 ? (
                <div className="space-y-2">
                  {netWorthParts.map(p => (
                    <div key={p.label} className="font-mono">
                      <div className="flex justify-between text-xs" style={{ color: p.color }}>
                        <span>{p.label}</span>
                        <span>{formatJPY(p.value)} ({Math.round(p.value / Math.max(1, netWorth) * 100)}%)</span>
                      </div>
                      <div className="h-1.5 bg-cyan-900/40 rounded mt-0.5">
                        <div className="h-full rounded" style={{ width: `${p.value / Math.max(1, netWorth) * 100}%`, backgroundColor: p.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-cyan-700 text-xs font-mono text-center py-2">資産データなし</div>
              )}
              {mercariTotal > 0 && (
                <div className="text-[10px] text-amber-500/80 font-mono mt-3 pt-2 border-t border-cyan-900/40">
                  ◈ うち自分で稼いだ額(メルカリ累計): {formatJPY(mercariTotal)}
                </div>
              )}
            </div>

            {/* 未来予測 */}
            <div className="border border-fuchsia-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-fuchsia-400 tracking-widest mb-1">// FUTURE_ORACLE — 複利の未来予測</div>
              <div className="text-[10px] text-fuchsia-700 mb-3">
                今の総資産に毎月積み立て、年利{projAnnualRate}%で複利運用したら…
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-[10px] text-fuchsia-600 mb-1">毎月の積立(円)</div>
                  <input type="number" value={projMonthly} onChange={e => setProjMonthly(e.target.value)}
                    className="w-full bg-black/40 border border-fuchsia-700/50 text-fuchsia-100 rounded px-2 py-1.5 text-sm focus:outline-none" min={0} placeholder="2000" />
                </div>
                <div>
                  <div className="text-[10px] text-fuchsia-600 mb-1">運用年数</div>
                  <input type="number" value={projYears} onChange={e => setProjYears(e.target.value)}
                    className="w-full bg-black/40 border border-fuchsia-700/50 text-fuchsia-100 rounded px-2 py-1.5 text-sm focus:outline-none" min={1} max={50} placeholder="10" />
                </div>
              </div>

              <div className="bg-black/30 border border-fuchsia-800/40 rounded-lg p-3 font-mono">
                <div className="text-center mb-3">
                  <div className="text-fuchsia-500 text-[10px]">{projYears || 0}年後の予測資産</div>
                  <div className="text-fuchsia-200 text-3xl font-black" style={{ textShadow: "0 0 10px #e879f9" }}>
                    {formatJPY(projFuture)}
                  </div>
                </div>

                {yearlyValues.length >= 2 && (
                  <div className="flex justify-center mb-3">
                    <Sparkline prices={[netWorth, ...yearlyValues]} color="#e879f9" />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[10px] text-cyan-400">
                      <span>積み立てた元本</span><span>{formatJPY(projContributed)}</span>
                    </div>
                    <div className="h-2 bg-cyan-900/40 rounded">
                      <div className="h-full rounded bg-cyan-500" style={{ width: `${projContributed / Math.max(1, projFuture) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-emerald-400">
                      <span>複利で増えた額 ✨</span><span>+{formatJPY(projGrowth)}</span>
                    </div>
                    <div className="h-2 bg-emerald-900/40 rounded">
                      <div className="h-full rounded bg-emerald-400" style={{ width: `${projGrowth / Math.max(1, projFuture) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-fuchsia-600/80 mt-3 leading-relaxed">
                ◈ お金がお金を生む「複利」のチカラ。早く始めるほど、増えた額(緑)が大きくなる。これが投資の神託だ。
              </div>
            </div>

            {/* INTEL BROKER — 経済予報(知性ポイントで先読み) */}
            <div className="border border-emerald-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-emerald-400 tracking-widest mb-1">// INTEL_BROKER — 経済予報</div>
              <div className="text-[10px] text-emerald-700 mb-3 leading-relaxed">
                知性ポイントを払えば、次に来る経済ウェザーを先読みできる。安い時に買い、高い時に売る計画を立てろ。
              </div>
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-emerald-600 text-[10px]">WISDOM_POINTS</div>
                <div className="text-emerald-300 text-2xl font-black">{forecast?.wisdomPoints ?? optis.wisdomPoints ?? 0} <span className="text-xs">pt</span></div>
              </div>

              {forecastMsg && (
                <div className="text-xs text-red-300 bg-red-900/30 border border-red-700/30 rounded-lg p-2 mb-3">{forecastMsg}</div>
              )}

              {forecast?.purchased && forecast.upcoming ? (
                <div className="bg-black/30 border border-emerald-800/40 rounded-lg p-3">
                  <div className="text-[10px] text-emerald-600 mb-1">// NEXT_WEATHER — 解読済み</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{forecast.upcoming.meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm" style={{ color: forecast.upcoming.meta.color }}>{forecast.upcoming.meta.label}</div>
                      <div className="text-[10px] text-gray-500">{forecast.upcoming.meta.desc}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-[9px] text-emerald-600">市場価格</div>
                      <div className="text-sm font-bold" style={{ color: forecast.upcoming.effectiveMultiplier > 1 ? "#f87171" : forecast.upcoming.effectiveMultiplier < 1 ? "#34d399" : "#94a3b8" }}>
                        ×{forecast.upcoming.effectiveMultiplier.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-emerald-300 bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-2">
                    {forecast.upcoming.effectiveMultiplier > 1.02
                      ? "📈 値上がり予報。欲しいパーツは今のうちに買っておけ。"
                      : forecast.upcoming.effectiveMultiplier < 0.98
                      ? "📉 値下がり予報。買うのは次の窓まで待て。売るなら今だ。"
                      : "➖ 価格は安定の見込み。落ち着いて取引しろ。"}
                  </div>
                </div>
              ) : (
                <button
                  onClick={buyForecast}
                  disabled={!forecast || forecast.wisdomPoints < forecast.cost}
                  className="w-full rounded-lg py-2.5 text-sm font-bold border border-emerald-500/50 text-emerald-200 bg-emerald-900/30 hover:bg-emerald-800/40 disabled:opacity-30 transition-colors"
                >
                  ▸ 次のウェザーを解読する(−{forecast?.cost ?? "?"} 知性pt)
                </button>
              )}
              {forecast && !forecast.purchased && forecast.wisdomPoints < forecast.cost && (
                <div className="text-[10px] text-emerald-700 mt-2 text-center">知性ポイントが足りない。キーワードをタップして貯めろ。</div>
              )}
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

              {market && (market.buyDiscount ?? 0) > 0 && (
                <div className="text-[10px] font-mono text-emerald-400 bg-emerald-900/20 border border-emerald-700/30 rounded-lg px-2 py-1.5 mb-2">
                  ◈ 買値割引 -{Math.round((market.buyDiscount ?? 0) * 100)}%
                  <span className="text-emerald-600 ml-1">
                    ({market.discountSource === "credit" ? `信用ランク ${market.rank?.label ?? ""}` : "商人属性"})
                  </span>
                </div>
              )}

              {market && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-black/30 border border-emerald-900/40 rounded-lg px-2 py-1.5">
                    <div className="text-[9px] text-emerald-700 tracking-widest">AWAKENING TIER</div>
                    <div className="text-emerald-300 font-mono text-sm">
                      {"★".repeat(market.awakeningTier ?? 0)}{"☆".repeat(4 - (market.awakeningTier ?? 0))}
                    </div>
                    <div className="text-[9px] text-emerald-600">
                      売却手数料: {Math.round((market.sellFee ?? MARKET_SELL_FEE) * 100)}%
                      {(market.awakeningTier ?? 0) > 0 && <span className="text-green-400 ml-1">↓ 自己投資効果</span>}
                    </div>
                  </div>
                  <div className="bg-black/30 border border-emerald-900/40 rounded-lg px-2 py-1.5">
                    <div className="text-[9px] text-emerald-700 tracking-widest">REALIZED P&L</div>
                    <div className={`font-mono text-sm ${(market.realizedPnl ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {(market.realizedPnl ?? 0) >= 0 ? "+" : ""}{market.realizedPnl ?? 0}G
                    </div>
                    <div className="text-[9px] text-emerald-600">累計確定損益</div>
                  </div>
                </div>
              )}

              {market?.activeWeather && (
                <div className="text-xs bg-red-900/30 border border-red-700/40 rounded-lg p-2 mb-3">
                  {(() => {
                    const wMeta = WEATHER_META[market.activeWeather!.type as WeatherType] ?? WEATHER_META.NEUTRAL;
                    return (
                      <div className="flex items-center gap-1.5">
                        <span>{wMeta.emoji}</span>
                        <span className="text-red-300 font-bold">{wMeta.label}</span>
                        <span className="text-red-400">×{market.weatherMultiplier.toFixed(2)}</span>
                        {market.hasShield && <span className="ml-auto text-cyan-400 font-bold">🛡 シールド中</span>}
                      </div>
                    );
                  })()}
                </div>
              )}

              {marketMsg && (
                <div className="text-xs text-emerald-200 bg-emerald-900/30 border border-emerald-700/30 rounded-lg p-2 mb-3">
                  {marketMsg}
                </div>
              )}
            </div>

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
                          {listing.unrealizedPnl != null && (
                            <span className={`ml-2 font-bold ${listing.unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {listing.unrealizedPnl >= 0 ? "+" : ""}{listing.unrealizedPnl}G
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => loadChart(listing.id)} className="text-[10px] text-emerald-700 border border-emerald-900/40 rounded px-1.5 py-0.5">📈</button>
                      <button onClick={() => sellPart(listing.id)} className="text-[10px] text-yellow-400 border border-yellow-700/40 rounded px-2 py-1 font-bold">売る</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {market && (market.recentTrades ?? []).length > 0 && (
              <div className="border border-emerald-900/30 rounded-xl p-3 bg-black/40">
                <div className="text-[10px] text-emerald-700 tracking-widest mb-2">// TRADE_LOG — 最近の取引</div>
                <div className="space-y-1">
                  {(market.recentTrades ?? []).slice(0, 5).map(trade => {
                    const p = PARTS.find(x => x.id === trade.partId);
                    return (
                      <div key={trade.id} className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-emerald-700">{trade.date}</span>
                        <span className="text-emerald-500 truncate mx-2">{p?.emoji ?? "◎"} {p?.name ?? trade.partId}</span>
                        <span className={trade.action === "SELL" ? "text-yellow-400" : "text-cyan-400"}>
                          {trade.action === "SELL" ? "SELL" : "BUY "} {trade.price}G
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                        <button onClick={() => loadChart(listing.id)} className="text-[10px] text-emerald-700 border border-emerald-900/40 rounded px-1.5 py-0.5">📈</button>
                        <button onClick={() => buyPart(listing.id)} disabled={!canAfford}
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

        {/* ── QUIZ ─────────────────────────────────────────────── */}
        {tab === "quiz" && (
          <div className="space-y-3">
            <div className="border border-red-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-red-400 tracking-widest mb-1">// NEWS_QUIZ — 経済ウェザー対策</div>
              <div className="text-[10px] text-red-700 mb-3">クイズに正解すると7日間の経済の盾を獲得。市場価格への影響を無効化。</div>
            </div>

            <div className="border border-cyan-500/30 rounded-xl p-3 bg-black/40">
              <div className="text-[10px] text-cyan-600 tracking-widest mb-2">// SHIELD_STATUS</div>
              {quizStatus?.hasShield ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛡</span>
                  <div>
                    <div className="text-cyan-300 font-bold text-sm">経済の盾 — アクティブ</div>
                    {quizStatus.shieldUntil && (
                      <div className="text-cyan-600 text-[10px]">
                        有効期限: {new Date(quizStatus.shieldUntil).toLocaleDateString("ja-JP")}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-cyan-800 text-xs font-mono">シールドなし — クイズに正解して取得しよう</div>
              )}
            </div>

            {quizStatus?.answeredToday && (
              <div className="border border-emerald-800/40 rounded-xl p-4 bg-black/40">
                <div className="text-[10px] text-emerald-600 tracking-widest mb-2">// DAILY_LIMIT</div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{quizStatus.lastAnswered?.correct ? "✅" : "❌"}</span>
                  <div>
                    <div className="text-emerald-400 text-sm font-bold">本日の出題は終了</div>
                    <div className="text-emerald-700 text-[10px]">
                      {quizStatus.lastAnswered?.correct
                        ? "正解済み — 盾を手に入れた。明日また出題される。"
                        : "不正解 — 明日また挑戦しよう。"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!quizStatus?.answeredToday && quizStatus?.quiz ? (() => {
              const wMeta = WEATHER_META[quizStatus.quiz!.weatherType as WeatherType] ?? WEATHER_META.NEUTRAL;
              return (
                <div className="border rounded-xl p-4 bg-black/40" style={{ borderColor: `${wMeta.color}40` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{wMeta.emoji}</span>
                    <div>
                      <div className="font-bold text-sm" style={{ color: wMeta.color }}>{wMeta.label}</div>
                      <div className="text-[10px] text-gray-500">{wMeta.desc}</div>
                    </div>
                    <div className="ml-auto text-[10px] font-mono" style={{ color: wMeta.color }}>
                      ×{wMeta.marketMultiplier}
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs mt-2 bg-gray-900/40 rounded-lg p-2">
                    Q: {quizStatus.quiz!.question}
                  </div>
                  <div className="text-[10px] text-cyan-600 mt-2">ホーム画面のバナーからクイズに挑戦しよう</div>
                </div>
              );
            })() : (
              <div className="text-cyan-700 text-xs font-mono text-center py-4 border border-cyan-900/30 rounded-xl">
                現在アクティブなクイズはありません
              </div>
            )}
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

            {/* CAREER_MATRIX */}
            <div className="border border-blue-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-blue-400 tracking-widest mb-3">// CAREER_MATRIX — 自己投資分析 (直近90日)</div>
              {!career ? <div className="text-blue-600 text-xs font-mono">LOADING…</div> : career.total === 0 ? (
                <div className="text-blue-700 text-xs font-mono text-center py-2">カテゴリ付きNeeds記録がありません</div>
              ) : (
                <div className="space-y-3">
                  {career.categories.map(cat => {
                    const meta = ASSET_META[cat.name as keyof typeof ASSET_META];
                    if (!meta) return null;
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: meta.color }}>{meta.emoji} {meta.label}</span>
                          <span className="text-gray-400 font-mono">{formatJPY(cat.total)} ({cat.pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${cat.pct}%`, backgroundColor: meta.color }} />
                        </div>
                      </div>
                    );
                  })}
                  {career.topCategory && (
                    <div className="text-[10px] text-blue-400 mt-2">
                      TOP: {ASSET_META[career.topCategory as keyof typeof ASSET_META]?.emoji} {ASSET_META[career.topCategory as keyof typeof ASSET_META]?.label}
                    </div>
                  )}
                </div>
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

        {/* ── FUND ─────────────────────────────────────────────── */}
        {tab === "fund" && (
          <div className="space-y-3">
            <div className="border border-indigo-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-indigo-400 tracking-widest mb-1">// INDEX_FUND — ジュニア・ファンド</div>
              <div className="text-[10px] text-indigo-700 mb-3">長期インデックス投資シミュレーション。月次リターンで複利運用。</div>
              {!fund ? <div className="text-indigo-600 text-xs font-mono">LOADING…</div> : (
                <>
                  <div className="grid grid-cols-2 gap-3 font-mono mb-4">
                    <div>
                      <div className="text-indigo-600 text-[10px]">CURRENT_VALUE</div>
                      <div className="text-indigo-200 text-xl font-black">{formatJPY(fund.currentValue)}</div>
                    </div>
                    <div>
                      <div className="text-indigo-600 text-[10px]">INVESTED</div>
                      <div className="text-indigo-300 text-sm">{formatJPY(fund.invested)}</div>
                    </div>
                    <div>
                      <div className="text-indigo-600 text-[10px]">GROWTH</div>
                      <div className={`text-sm font-bold ${fund.growthAmount >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {fund.growthAmount >= 0 ? "+" : ""}{formatJPY(fund.growthAmount)} ({fund.growthPct}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-indigo-600 text-[10px]">ANNUAL_RATE</div>
                      <div className="text-indigo-300 text-sm">{fund.baseReturnRate}%</div>
                    </div>
                  </div>

                  {fund.recentTxs.length >= 2 && (
                    <div className="mb-3">
                      <div className="text-[10px] text-indigo-600 mb-1">VALUE TREND</div>
                      <FundSparkline txs={fund.recentTxs} color="#818cf8" />
                    </div>
                  )}

                  {daysUntilReturn !== null && (
                    <div className="text-[10px] text-indigo-500 mb-3">
                      次の月次リターン: {daysUntilReturn === 0 ? "本日！" : `あと ${daysUntilReturn} 日`}
                    </div>
                  )}

                  {fundMsg && (
                    <div className="text-xs text-indigo-200 bg-indigo-900/30 border border-indigo-700/30 rounded-lg p-2 mb-3">
                      {fundMsg}
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="text-[10px] text-indigo-500 mb-1">投資する(財布から引き落とし)</div>
                    <div className="flex gap-2">
                      <input type="number" value={fundInvestAmt} onChange={e => setFundInvestAmt(e.target.value)}
                        className="flex-1 bg-black/40 border border-indigo-700/50 text-indigo-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        placeholder="円" min={1} />
                      <button onClick={fundInvest} disabled={!fundInvestAmt || Number(fundInvestAmt) <= 0}
                        className="bg-indigo-700 text-white rounded-lg px-4 text-sm font-bold disabled:opacity-40">
                        投資
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-indigo-500 mb-1">引き出す(財布に戻す)</div>
                    <div className="flex gap-2">
                      <input type="number" value={fundWithdrawAmt} onChange={e => setFundWithdrawAmt(e.target.value)}
                        className="flex-1 bg-black/40 border border-indigo-700/50 text-indigo-100 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        placeholder="円" min={1} />
                      <button onClick={fundWithdrawAction}
                        disabled={!fundWithdrawAmt || Number(fundWithdrawAmt) <= 0 || Number(fundWithdrawAmt) > (fund?.currentValue ?? 0)}
                        className="bg-indigo-600/50 text-indigo-200 rounded-lg px-4 text-sm font-bold disabled:opacity-40 border border-indigo-600/40">
                        引出
                      </button>
                    </div>
                  </div>

                  {fund.recentTxs.length > 0 && (
                    <div className="mt-4">
                      <div className="text-[10px] text-indigo-600 tracking-widest mb-2">RECENT_TRANSACTIONS</div>
                      <div className="space-y-1">
                        {fund.recentTxs.slice(0, 5).map(tx => (
                          <div key={tx.id} className="flex justify-between text-[10px] font-mono text-indigo-400">
                            <span className={tx.type === "RETURN" ? "text-emerald-400" : tx.type === "PARENT_BONUS" ? "text-yellow-400" : tx.type === "WITHDRAW" ? "text-red-400" : "text-indigo-300"}>
                              {tx.type === "INVEST" ? "↑" : tx.type === "WITHDRAW" ? "↓" : tx.type === "RETURN" ? "+" : "★"} {tx.type}
                            </span>
                            <span>{tx.type === "WITHDRAW" ? "-" : "+"}{formatJPY(tx.amount)}</span>
                            <span className="text-indigo-700">{tx.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── GUILD ─────────────────────────────────────────────── */}
        {tab === "guild" && (
          <div className="space-y-3">
            {/* デイリーミッション */}
            <div className="border border-emerald-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-emerald-400 tracking-widest mb-1">// DAILY_MISSION — 今日のミッション</div>
              <div className="text-[10px] text-emerald-700 mb-3">毎日リセット。3つ達成して報酬を受け取れ。</div>

              {guildMsg && (
                <div className="text-xs text-emerald-300 bg-emerald-900/30 border border-emerald-700/30 rounded-lg p-2 mb-3 font-mono">
                  {guildMsg}
                </div>
              )}

              {guildMissions.length === 0 ? (
                <div className="text-emerald-700 text-xs font-mono text-center py-4">ミッション読み込み中…</div>
              ) : (
                <div className="space-y-2">
                  {guildMissions.map((m) => {
                    const brainMatch = brain?.brainType === m.brainTag;
                    return (
                      <div key={m.type}
                        className={`rounded-xl p-3 border transition-all
                          ${m.claimed ? "border-emerald-900/20 bg-black/20 opacity-50"
                            : m.completed ? "border-emerald-400/60 bg-emerald-950/40"
                            : "border-emerald-900/40 bg-black/30"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {m.claimed && <span className="text-emerald-500 text-xs">✓</span>}
                              {!m.claimed && m.completed && <span className="text-yellow-400 text-xs">●</span>}
                              {!m.claimed && !m.completed && <span className="text-emerald-800 text-xs">○</span>}
                              <span className={`text-xs font-bold ${m.claimed ? "text-emerald-700" : m.completed ? "text-emerald-300" : "text-emerald-500"}`}>
                                {m.title}
                              </span>
                              {brainMatch && !m.claimed && (
                                <span className="text-[9px] bg-cyan-900/40 text-cyan-400 border border-cyan-800/40 rounded px-1">
                                  {BRAIN_META[m.brainTag].emoji} 推奨
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-emerald-700 leading-snug pl-4">{m.desc}</div>
                            <div className="text-[9px] text-emerald-800 pl-4 mt-0.5">
                              報酬: +{m.reward.exp} EXP / +{m.reward.gcoins}G
                            </div>
                          </div>
                          {m.completed && !m.claimed && (
                            <button
                              onClick={() => claimMission(m.type)}
                              className="shrink-0 text-[10px] font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded-lg px-2 py-1"
                            >
                              受取
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ギルド同盟(既存) */}
            <GuildPanel unlocked={state?.unlocked ?? []} />
          </div>
        )}

        {/* ── GHOST(シャドウ・チェイサー) ─────────────────────────── */}
        {tab === "ghost" && (
          <div className="space-y-4">
            <div className="border border-fuchsia-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-fuchsia-500 tracking-widest mb-3">// SHADOW_CHASER — 今週のAIライバル</div>
              {!ghost ? <div className="text-fuchsia-600 text-xs font-mono">SCANNING…</div> : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{ghost.ghost.brainEmoji}</span>
                    <div>
                      <div className="text-fuchsia-200 font-bold font-mono">{ghost.ghost.name}</div>
                      <div className="text-fuchsia-500 text-[10px] font-mono">Lv.{ghost.ghost.level} ・ {ghost.ghost.brainLabel}</div>
                    </div>
                    {ghost.ghost.defeated && <span className="ml-auto text-[10px] text-emerald-400 border border-emerald-500/50 rounded px-2 py-0.5 font-mono">DEFEATED</span>}
                  </div>

                  {/* 自分のスコア */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-cyan-400">YOU — 知性・やりくりスコア</span>
                      <span className="text-cyan-200">{ghost.me.score}</span>
                    </div>
                    <div className="h-2.5 bg-cyan-950 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 transition-all" style={{ width: `${Math.min(100, ghost.me.score)}%` }} />
                    </div>
                    <div className="text-[9px] text-cyan-700 font-mono mt-1">やりくり {ghost.me.budgetScore} / 知性 {ghost.me.quizScore}</div>
                  </div>

                  {/* ライバルの進捗(擬似リアルタイム) + 目標ライン */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-fuchsia-400">RIVAL — 進捗メーター</span>
                      <span className="text-fuchsia-200">{ghost.ghost.progress}%</span>
                    </div>
                    <div className="h-2.5 bg-fuchsia-950 rounded-full overflow-hidden relative">
                      <div className="h-full bg-fuchsia-400 transition-all" style={{ width: `${ghost.ghost.progress}%` }} />
                      <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-300" style={{ left: `${Math.min(100, ghost.ghost.targetScore)}%` }} />
                    </div>
                    <div className="text-[9px] text-yellow-500 font-mono mt-1">勝利ライン: スコア {ghost.ghost.targetScore} 突破</div>
                  </div>

                  {/* 略奪報酬プレビュー */}
                  {ghost.rewardPart && (
                    <div className="border border-fuchsia-700/40 rounded-lg p-3 bg-fuchsia-950/30 flex items-center gap-3 mb-3">
                      <span className="text-2xl">{ghost.rewardPart.emoji}</span>
                      <div className="flex-1">
                        <div className="text-fuchsia-200 text-xs font-bold">{ghost.rewardPart.name}</div>
                        <div className="text-fuchsia-600 text-[10px] font-mono">略奪報酬 ・ {ghost.rewardPart.rarity}{ghost.rewardPart.owned ? " ・ 入手済" : ""}</div>
                      </div>
                    </div>
                  )}

                  {ghost.ghost.defeated ? (
                    <div className="text-emerald-400 text-xs font-mono text-center py-2">◈ 今週は勝利済み。来週、新たなライバルが現れる。</div>
                  ) : ghost.canClaim ? (
                    <button onClick={claimGhost}
                      className="w-full py-3 rounded-lg bg-fuchsia-600 text-white text-sm font-bold font-mono hover:bg-fuchsia-500 transition-colors animate-pulse">
                      ⚡ HACK ▶ ライバルのパーツを略奪する
                    </button>
                  ) : (
                    <div className="text-fuchsia-600 text-xs font-mono text-center py-2">
                      スコア {ghost.ghost.targetScore} を超えると略奪できる。今週も予算とクイズで差をつけろ。
                    </div>
                  )}
                  {ghostMsg && <div className="text-red-400 text-xs font-mono text-center mt-2">{ghostMsg}</div>}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── CORE(メインフレーム・クラッキング) ──────────────────── */}
        {tab === "core" && (
          <div className="space-y-4">
            <div className="border border-rose-500/40 rounded-xl p-4 bg-black/50">
              <div className="text-[11px] text-rose-500 tracking-widest mb-3">// MAINFRAME — 仮想中央銀行データコア</div>
              {!mainframe ? <div className="text-rose-600 text-xs font-mono">CONNECTING…</div> : !mainframe.unlocked ? (
                <div className="text-rose-400/80 text-xs font-mono py-6 text-center leading-relaxed">
                  🔒 最深部はロックされている。<br />Lv.{mainframe.minLevel} 以上で接続可能。（現在 Lv.{mainframe.level}）
                </div>
              ) : mainframe.solved ? (
                <div className="space-y-3">
                  <div className="text-emerald-400 text-sm font-mono font-bold text-center py-2">◈ SYSTEM DOWN — このサイクルは攻略済み</div>
                  {mainframe.titlePart && (
                    <div className="border border-rose-700/40 rounded-lg p-3 bg-rose-950/30 flex items-center gap-3">
                      <span className="text-2xl">{mainframe.titlePart.emoji}</span>
                      <div>
                        <div className="text-rose-200 text-xs font-bold">{mainframe.titlePart.name}</div>
                        <div className="text-rose-600 text-[10px] font-mono">ソロ限定・最高位称号 ・ {mainframe.titlePart.rarity}</div>
                      </div>
                    </div>
                  )}
                  {mainframe.problem.explanation && (
                    <div className="text-gray-400 text-xs leading-relaxed border border-gray-800 rounded-lg p-3">{mainframe.problem.explanation}</div>
                  )}
                  <div className="text-rose-700 text-[10px] font-mono text-center">次の暗号は隔週でアップデートされる。</div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-rose-300/90 text-[11px] font-mono">誰の力も借りず、自分の知識だけで防壁をこじ開けろ。1問完結・複合暗号。</div>
                  <div className="text-white font-bold text-sm leading-relaxed">{mainframe.problem.question}</div>
                  {!mfResult ? (
                    <>
                      <div className="space-y-2">
                        {mainframe.problem.options.map((opt, i) => (
                          <button key={i} onClick={() => setMfSelected(i)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-mono transition-colors
                              ${mfSelected === i ? "border-rose-400 bg-rose-900/40 text-rose-200" : "border-gray-700 bg-gray-900/60 text-gray-300 hover:border-gray-500"}`}>
                            {String.fromCharCode(65 + i)}. {opt}
                          </button>
                        ))}
                      </div>
                      <button onClick={solveMainframe} disabled={mfSelected === null}
                        className="w-full py-3 rounded-lg bg-rose-600 text-white text-sm font-bold font-mono hover:bg-rose-500 transition-colors disabled:opacity-40">
                        ⚡ CRACK ▶ 1タップで解読する
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className={`rounded-lg p-3 border text-center ${mfResult.correct ? "border-emerald-500/60 bg-emerald-900/30" : "border-red-500/60 bg-red-900/30"}`}>
                        <div className={`font-bold font-mono ${mfResult.correct ? "text-emerald-300" : "text-red-300"}`}>
                          {mfResult.correct ? "HACK SUCCESS" : "ACCESS DENIED"}
                        </div>
                      </div>
                      <div className="text-gray-400 text-xs leading-relaxed border border-gray-800 rounded-lg p-3">{mfResult.explanation}</div>
                      {!mfResult.correct && (
                        <button onClick={() => { setMfResult(null); setMfSelected(null); }}
                          className="w-full py-2.5 rounded-lg border border-gray-600 text-gray-300 text-xs font-mono">再挑戦する</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── JUNK(スクラップ・ジャンク屋) ────────────────────────── */}
        {tab === "junk" && (
          <div className="space-y-4">
            <div className="border border-lime-500/40 rounded-xl p-4 bg-black/40">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] text-lime-500 tracking-widest">// JUNK_SHOP — 闇のディーラーAI</div>
                <div className="text-lime-300 text-xs font-mono">⛁ 生データ {junk?.rawData ?? 0}</div>
              </div>
              {!junk ? <div className="text-lime-600 text-xs font-mono">LOADING…</div> : (
                <>
                  {/* 合成(密造) */}
                  <div className="border border-lime-700/40 rounded-lg p-3 bg-lime-950/20 mb-4">
                    <div className="text-lime-300 text-xs font-bold mb-1">特級パーツを密造</div>
                    <div className="text-lime-600 text-[10px] font-mono mb-2">生データ {junk.craftCost} を消費して、英単語データ入りの特級パーツを1つクラフト</div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {junk.craftPool.map(c => (
                        <span key={c.id} className={`text-[10px] font-mono px-2 py-0.5 rounded border ${c.owned ? "border-lime-600/40 text-lime-600" : "border-lime-400/60 text-lime-300"}`}>
                          {c.emoji} {c.name}{c.owned ? " ✓" : ""}
                        </span>
                      ))}
                    </div>
                    <button onClick={craft} disabled={!junk.canCraft}
                      className="w-full py-2.5 rounded-lg bg-lime-600 text-black text-sm font-bold font-mono hover:bg-lime-500 transition-colors disabled:opacity-40">
                      🧪 CRAFT ▶ 密造する
                    </button>
                  </div>

                  {/* 分解 */}
                  <div className="text-lime-500 text-[10px] font-mono mb-2">// 余ったパーツを分解して生データに還元(装備中・基本は不可)</div>
                  {junk.disassemblable.length === 0 ? (
                    <div className="text-lime-700 text-xs font-mono text-center py-3">分解できるパーツがない。</div>
                  ) : (
                    <div className="space-y-1.5">
                      {junk.disassemblable.map(p => (
                        <div key={p.id} className="flex items-center gap-2 border border-lime-900/40 rounded-lg px-3 py-2">
                          <span className="text-lg">{p.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-lime-200 text-xs truncate">{p.name}</div>
                            <div className="text-lime-700 text-[9px] font-mono">{p.rarity} → +{p.raw} 生データ</div>
                          </div>
                          <button onClick={() => disassemble(p.id)}
                            className="text-[10px] font-mono text-lime-300 border border-lime-600/50 rounded px-2 py-1 hover:bg-lime-900/40">分解</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {junkMsg && <div className="text-lime-300 text-xs font-mono text-center mt-3">{junkMsg}</div>}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── DEAL (闇取引) ─────────────────────────────────────── */}
        {tab === "deal" && (
          <div className="space-y-3">
            <div className="border border-red-900/60 rounded-xl p-4 bg-black/60">
              <div className="text-[11px] text-red-400 tracking-widest mb-1">// BLACK_DEAL — 覆面ディーラー</div>

              {/* REPロック */}
              {blackDeal?.locked && (
                <div className="text-center py-6 font-mono">
                  <div className="text-4xl mb-2">🚪</div>
                  <div className="text-red-300 text-sm font-bold mb-1">「……新入りか。まだお前と話すことはない」</div>
                  <div className="text-[11px] text-red-400/70 mb-3">
                    裏社会での実績(REP)が {blackDeal.minRep} を超えると、ディーラーが取引テーブルに招く。
                  </div>
                  <div className="text-xs text-amber-400">
                    現在: {darkRep?.rank.emoji} REP {blackDeal.rep} / {blackDeal.minRep}
                  </div>
                  <div className="mt-2 h-1.5 bg-red-950 rounded-full overflow-hidden max-w-[200px] mx-auto">
                    <div className="h-full bg-gradient-to-r from-red-600 to-amber-500" style={{ width: `${Math.min(100, Math.round((blackDeal.rep / (blackDeal.minRep || 1)) * 100))}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-3">
                    解読・暗号解除・ライバル撃破・密造でREPを稼げ
                  </div>
                </div>
              )}

              {/* 取引テーブル */}
              {blackDeal && !blackDeal.locked && blackDeal.deal && (
                <div className="font-mono">
                  <div className="text-gray-400 text-[11px] mb-3 leading-relaxed">
                    「よう。今日の"ブツ"だ。相場の{100 - blackDeal.deal.discountPct}%で譲ってやる。
                    ……本物かどうか？ 自分の目で確かめな。鑑定屋を呼ぶなら {blackDeal.deal.inspectCost}G だ」
                  </div>

                  <div className="bg-gray-950 border border-red-800/40 rounded-xl p-4 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{blackDeal.deal.part?.emoji ?? "❓"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold text-sm">{blackDeal.deal.part?.name ?? "???"}</div>
                        <div className="text-[10px] text-gray-500">RARITY: {blackDeal.deal.part?.rarity}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-300 font-bold text-lg">{blackDeal.deal.price}G</div>
                        <div className="text-[10px] text-gray-500 line-through">相場 {blackDeal.deal.basePrice}G</div>
                        <div className="text-[10px] text-amber-400">▼{blackDeal.deal.discountPct}% OFF</div>
                      </div>
                    </div>

                    {/* 鑑定結果 */}
                    {blackDeal.deal.inspected && blackDeal.deal.legit !== null && !blackDeal.deal.outcome && (
                      <div className={`mt-3 text-xs rounded-lg p-2 border ${blackDeal.deal.legit
                        ? "text-emerald-300 bg-emerald-900/20 border-emerald-700/40"
                        : "text-red-300 bg-red-900/30 border-red-700/50"}`}>
                        🔍 鑑定済み: {blackDeal.deal.legit ? "✅ 真正品 — 買いだ" : "⚠️ 粗悪品(スキャム) — 手を出すな"}
                      </div>
                    )}
                  </div>

                  {/* 決着前: アクション */}
                  {!blackDeal.deal.outcome && !dealResult && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => dealAction("inspect")}
                          disabled={dealBusy || blackDeal.deal.inspected}
                          className="py-2.5 rounded-lg text-xs font-bold border border-cyan-700/60 text-cyan-300 bg-cyan-950/40 disabled:opacity-40"
                        >
                          🔍 鑑定する (−{blackDeal.deal.inspectCost}G)
                        </button>
                        <button
                          onClick={() => dealAction("buy")}
                          disabled={dealBusy || (blackDeal.deal.inspected && blackDeal.deal.legit === false)}
                          className="py-2.5 rounded-lg text-xs font-bold border border-red-700/60 text-red-300 bg-red-950/40 disabled:opacity-40"
                        >
                          💰 買う (−{blackDeal.deal.price}G)
                        </button>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-2 text-center">
                        所持: {blackDeal.deal.gcoins}G ・ 見送るのも取引のうちだ(明日また来い)
                      </div>
                    </>
                  )}

                  {/* 決着後 */}
                  {(blackDeal.deal.outcome || dealResult) && (
                    <div className={`rounded-xl p-4 text-center border ${
                      (dealResult?.outcome ?? blackDeal.deal.outcome) === "SCAMMED"
                        ? "bg-red-950/50 border-red-600/60"
                        : "bg-emerald-950/40 border-emerald-600/50"}`}>
                      <div className="text-3xl mb-1">
                        {(dealResult?.outcome ?? blackDeal.deal.outcome) === "SCAMMED" ? "💸" : (dealResult?.outcome ?? blackDeal.deal.outcome) === "WIN_JACKPOT" ? "🤑" : "🎁"}
                      </div>
                      <div className={`font-bold text-sm mb-2 ${(dealResult?.outcome ?? blackDeal.deal.outcome) === "SCAMMED" ? "text-red-300" : "text-emerald-300"}`}>
                        {(dealResult?.outcome ?? blackDeal.deal.outcome) === "SCAMMED" ? "取引失敗 — 掴まされた"
                          : (dealResult?.outcome ?? blackDeal.deal.outcome) === "WIN_JACKPOT" ? `転売成功 +${dealResult?.jackpot ?? ""}G` : "取引成立 — 格安入手"}
                      </div>
                      {dealResult?.lesson && (
                        <div className="text-[11px] text-gray-400 leading-relaxed">{dealResult.lesson}</div>
                      )}
                      {dealResult?.rawDataGained ? (
                        <div className="text-[10px] text-cyan-500 mt-1">慰謝料: 生データ +{dealResult.rawDataGained}</div>
                      ) : null}
                      <div className="text-[10px] text-gray-600 mt-2">次の取引は明日</div>
                    </div>
                  )}

                  {dealMsg && (
                    <div className="mt-2 text-xs text-cyan-300 bg-cyan-900/20 rounded-lg p-2">{dealMsg}</div>
                  )}

                  <div className="mt-3 pt-2 border-t border-red-900/30 text-[10px] text-gray-600 leading-relaxed">
                    ◈ Optisのメモ: 「うまい話ほど裏を取る。鑑定料は"情報のコスト"──
                    プロの投資家がアナリストに金を払うのと同じ理屈だ」
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CLOSET ────────────────────────────────────────────── */}
        {tab === "closet" && (
          <div className="space-y-3">
            {/* 装備中の効果サマリー */}
            {state && (() => {
              const slots = [
                { id: state.equippedBody, label: "BODY" },
                { id: state.equippedAura, label: "AURA" },
                { id: state.equippedAccessory, label: "ACC" },
              ];
              const activeEffects: { key: string; val: string }[] = [];
              for (const s of slots) {
                const p = PARTS.find(x => x.id === s.id);
                if (!p?.effect) continue;
                const e = p.effect as PartEffect;
                if (e.expBonus)         activeEffects.push({ key: `${p.emoji ?? "◎"} 全EXP`, val: `+${Math.round(e.expBonus * 100)}%` });
                if (e.needsExpBonus)    activeEffects.push({ key: `${p.emoji ?? "◎"} NeedsEXP`, val: `+${Math.round(e.needsExpBonus * 100)}%` });
                if (e.sellFeeReduction) activeEffects.push({ key: `${p.emoji ?? "◎"} 売却手数料`, val: `-${Math.round(e.sellFeeReduction * 100)}%` });
                if (e.forecastDiscount) activeEffects.push({ key: `${p.emoji ?? "◎"} 予報コスト`, val: `-${Math.round(e.forecastDiscount * 100)}%` });
                if (e.wisdomBonus)      activeEffects.push({ key: `${p.emoji ?? "◎"} 知性タップ`, val: `+${e.wisdomBonus}pt` });
              }
              return activeEffects.length > 0 ? (
                <div className="border border-cyan-700/30 rounded-xl p-3 bg-black/40">
                  <div className="text-[9px] text-cyan-600 tracking-widest mb-2">// ACTIVE_EFFECTS — 装備中の効果</div>
                  <div className="grid grid-cols-2 gap-1">
                    {activeEffects.map((ae, i) => (
                      <div key={i} className="flex justify-between text-[10px] font-mono bg-cyan-950/30 rounded px-1.5 py-0.5">
                        <span className="text-cyan-600">{ae.key}</span>
                        <span className="text-cyan-300">{ae.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            <div className="border border-cyan-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-cyan-500 tracking-widest mb-3">// CUSTOMIZE — 所持パーツを装備</div>
              <div className="grid grid-cols-3 gap-2">
                {PARTS.map(part => {
                  const owned = state?.unlocked.includes(part.id);
                  const equipped = state?.equippedAura === part.id || state?.equippedAccessory === part.id || state?.equippedBody === part.id;
                  const mktEntry = market?.listings.find(l => l.id === part.id);
                  const e = part.effect as PartEffect | undefined;
                  const effectTags = e ? [
                    e.expBonus         ? `EXP+${Math.round(e.expBonus * 100)}%` : null,
                    e.needsExpBonus    ? `N+${Math.round(e.needsExpBonus * 100)}%` : null,
                    e.sellFeeReduction ? `手数料-${Math.round(e.sellFeeReduction * 100)}%` : null,
                    e.forecastDiscount ? `予報-${Math.round(e.forecastDiscount * 100)}%` : null,
                    e.wisdomBonus      ? `知性+${e.wisdomBonus}` : null,
                  ].filter(Boolean) : [];
                  return (
                    <button key={part.id} disabled={!owned} onClick={() => owned && equip(part)}
                      className={`rounded-lg p-2 text-center border text-xs transition-all
                        ${equipped ? "border-cyan-300 bg-cyan-500/20" : owned ? "border-cyan-800 bg-black/40" : "border-gray-800 opacity-30"}`}>
                      <div className="text-xl mb-0.5">{part.emoji ?? (part.type === "aura" ? "◎" : "▣")}</div>
                      <div className="text-cyan-200 leading-tight text-[10px]">{part.name}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: RARITY_META[part.rarity].color }}>
                        {owned ? RARITY_META[part.rarity].label : "未所持"}
                      </div>
                      {effectTags.length > 0 && (
                        <div className="text-[8px] text-yellow-500 mt-0.5 leading-tight">{effectTags[0]}</div>
                      )}
                      {owned && mktEntry && !equipped && (
                        <div className="text-[9px] text-yellow-600 mt-0.5">{marketSellPrice(mktEntry.currentPrice)}G</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STATUS ────────────────────────────────────────────── */}
        {tab === "status" && (
          <div className="space-y-3">
            {/* ハッカーREP(名声) */}
            {darkRep && (
              <div className="border border-amber-700/50 rounded-xl p-4 bg-black/50 font-mono">
                <div className="text-[11px] text-amber-500 tracking-widest mb-2">// HACKER_REPUTATION</div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{darkRep.rank.emoji}</span>
                  <div className="flex-1">
                    <div className="text-amber-300 font-bold text-sm">{darkRep.rank.name}</div>
                    <div className="text-[10px] text-amber-500/80">REP {darkRep.rep}</div>
                  </div>
                  {darkRep.next && (
                    <div className="text-right text-[10px] text-gray-500">
                      次: {darkRep.next.rank.emoji} {darkRep.next.rank.name}<br />あと {darkRep.next.remaining}
                    </div>
                  )}
                </div>
                {darkRep.next && (
                  <div className="h-1.5 bg-amber-950 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-gradient-to-r from-amber-600 to-yellow-400"
                      style={{ width: `${Math.min(100, Math.round((darkRep.rep / darkRep.next.rank.minRep) * 100))}%` }} />
                  </div>
                )}
                <div className="space-y-1">
                  {darkRep.breakdown.map(b => (
                    <div key={b.label} className="flex justify-between text-[11px]">
                      <span className="text-gray-500">{b.label} ×{b.count}</span>
                      <span className="text-amber-400">+{b.rep}</span>
                    </div>
                  ))}
                  {darkRep.breakdown.length === 0 && (
                    <div className="text-[11px] text-gray-600">まだ実績なし──解読・暗号解除・撃破・密造でREPを稼げ</div>
                  )}
                </div>
              </div>
            )}

            {/* DARK CHARGE — 匿名スポンサー(親)からの裏口座送金 */}
            {learning && (learning.parentAlertAt || learning.parentBoosted) && (
              <div className="border border-fuchsia-500/50 rounded-xl p-4 bg-black/50">
                <div className="text-[11px] text-fuchsia-400 tracking-widest mb-2">// DARK_CHARGE — 匿名スポンサー</div>
                {learning.parentBoosted ? (
                  <div className="font-mono">
                    <div className="text-fuchsia-200 text-sm font-bold mb-1">💸 裏口座への匿名送金を検知</div>
                    <div className="text-[11px] text-fuchsia-300/80 leading-relaxed">
                      正体不明のスポンサーから、お前の計画性(信用)に対して資金が送金された。
                    </div>
                    <div className="mt-2 text-[11px] text-emerald-300 bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-2">
                      ◈ Optisが暗号を翻訳: 「親IDを検知。これは『勉強頑張れよ』という暗号メッセージだ」
                    </div>
                  </div>
                ) : (
                  <div className="font-mono">
                    <div className="text-fuchsia-200 text-sm font-bold mb-1 neon-flicker">📡 スポンサーがお前を監視している…</div>
                    <div className="text-[11px] text-fuchsia-300/80 leading-relaxed">
                      お前のロジカルレベルが【{learning.layerLabel}】に到達。
                      正体不明のパトロンが裏口座の送金を検討中だ。解読(DECODE)を続けろ。
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border border-cyan-500/40 rounded-xl p-4 bg-black/40">
              <div className="text-[11px] text-cyan-500 tracking-widest mb-3">// STATUS_HACK</div>
              <div className="grid grid-cols-2 gap-3 font-mono text-sm">
                {[
                  ["LEVEL", String(optis.level)],
                  ["CREDIT_SCORE", `${optis.creditScore}/100`],
                  ["TOTAL_EXP", String(optis.experience)],
                  ["EXP_TO_NEXT", String(expRemain)],
                  ["G_COINS", `${gcoins}G`],
                  ["WISDOM_PTS", `${forecast?.wisdomPoints ?? optis.wisdomPoints ?? 0}pt`],
                  ["GENERATION", `Gen.${generation}`],
                  ["LANG_MODE", langMode],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-cyan-600 text-[10px]">{k}</div>
                    <div className="text-cyan-200 text-lg">{v}</div>
                  </div>
                ))}
              </div>

              {/* 信用ランク — creditScore の実特典 */}
              {(() => {
                const rank = creditRank(optis.creditScore);
                return (
                  <div className="mt-4 pt-3 border-t border-cyan-900/40">
                    <div className="text-[10px] text-emerald-500 tracking-widest mb-1">// CREDIT_RANK — 信用ランク</div>
                    <div className="flex items-center justify-between">
                      <div className="text-emerald-200 text-sm font-bold font-mono">{rank.label}</div>
                      <div className="text-[10px] text-emerald-600 font-mono">SCORE {optis.creditScore}/100</div>
                    </div>
                    <div className="text-[11px] text-emerald-300/80 font-mono mt-1">
                      マーケット買値 -{Math.round(rank.marketDiscount * 100)}% / 経済予報 -{Math.round(rank.forecastDiscount * 100)}%
                    </div>
                    {rank.tier < 4 && (
                      <div className="text-[10px] text-emerald-700 mt-1">
                        信用スコアを上げると割引UP(ノーマネーデー申告・成果報告・ローン完済で上昇)
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ワン・ワード・ミッション */}
              <div className="mt-4 pt-3 border-t border-cyan-900/40">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span>🔤</span> WORD MISSION
                </div>
                {missions.filter(m => !m.solvedAt).slice(0, 1).map(mission => (
                  <div key={mission.id} className="bg-gray-800 rounded-xl p-3">
                    <div className="text-gray-400 text-xs mb-2">{mission.hint}</div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-white/40 text-sm font-mono">{"◯".repeat(mission.word.length)}</span>
                      <span className="text-gray-500 text-xs">= {mission.translation}</span>
                      <span className="ml-auto text-yellow-400 text-xs">+{mission.expReward} EXP</span>
                    </div>
                    {missionResult?.id === mission.id ? (
                      <div className={`text-center py-2 rounded-lg text-sm font-bold ${missionResult.correct ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                        {missionResult.correct ? `✅ ${missionResult.word} (${missionResult.translation}) — 正解！` : `❌ 不正解。もう一度考えてみろ。`}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {(mission.choices as string[]).map((choice, i) => (
                          <button
                            key={i}
                            onClick={async () => {
                              const res = await fetch(`/api/wordmission/${mission.id}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ selectedIndex: i }),
                              });
                              const data = await res.json();
                              setMissionResult({ id: mission.id, correct: data.correct, word: data.word, translation: data.translation });
                              if (data.correct) {
                                setTimeout(() => {
                                  setMissions(prev => prev.map(m => m.id === mission.id ? { ...m, solvedAt: new Date().toISOString() } : m));
                                  setMissionResult(null);
                                  onChanged?.();
                                }, 1800);
                              }
                            }}
                            className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-mono py-2 px-1 rounded-lg transition-colors"
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {missions.filter(m => m.solvedAt).length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    ✅ 解除済み: {missions.filter(m => m.solvedAt).map(m => m.word).join(", ")}
                  </div>
                )}
                {missions.filter(m => !m.solvedAt).length === 0 && missions.length > 0 && (
                  <div className="text-center py-3 text-green-400 text-sm">🏆 全ミッション解除済み</div>
                )}
              </div>

              {/* EN mode toggle */}
              <div className="mt-4 pt-3 border-t border-cyan-900/40">
                <div className="text-[10px] text-cyan-600 mb-2 tracking-widest">// LANG_MODE</div>
                {optis.level >= 8 ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-cyan-300">
                        {langMode === "EN" ? "🌏 English Mode — EXP ×1.5" : "🇯🇵 日本語モード"}
                      </div>
                      <div className="text-[10px] text-cyan-700 mt-0.5">英語モードでEXP1.5倍獲得</div>
                    </div>
                    <button
                      onClick={toggleLang}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${langMode === "EN"
                        ? "bg-cyan-900/60 border-cyan-400 text-cyan-200"
                        : "border-cyan-700/40 text-cyan-600 hover:border-cyan-500"}`}
                    >
                      {langMode === "EN" ? "EN ✓" : "EN オフ"}
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-cyan-800">英語モードはLv.8で解放 (現在 Lv.{optis.level})</div>
                )}
                {langMsg && (
                  <div className="text-xs text-cyan-300 mt-2 bg-cyan-900/20 rounded-lg p-2">{langMsg}</div>
                )}
              </div>

              {generation > 1 && (
                <div className="mt-4 pt-3 border-t border-cyan-900/40">
                  <div className="text-[10px] text-fuchsia-500 tracking-widest mb-1">// GENERATION_BONUS</div>
                  <div className="text-xs text-fuchsia-300 font-mono">EXP_MULTIPLIER: ×{generationBonus(generation).expMultiplier.toFixed(1)}</div>
                  <div className="text-xs text-fuchsia-300 font-mono">DARK_WEB_HOUR: {generationBonus(generation).darkWebHour}:00〜</div>
                  <div className="text-xs text-fuchsia-300 font-mono">ADVICE_LEVEL: {generationBonus(generation).advancedAdvice ? "ADVANCED" : "BASIC"}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SECRET DROP — 23:00 ゲリラ・ウィンドウ ──────────────── */}
      {dropOverlay && (
        <div className="fixed inset-0 z-[95] bg-black/85 flex items-center justify-center p-6">
          <CodeRain color="#ef4444" opacity={0.2} />
          <div className="relative z-10 w-full max-w-sm text-center">
            {dropReward ? (
              <div className="reward-pop border border-red-500/60 rounded-2xl p-6 bg-black/70">
                <div className="text-5xl mb-2">🛰️</div>
                <div className="text-red-300 font-black text-lg mb-1">サルベージ成功</div>
                <div className="text-emerald-300 font-mono text-sm">+{dropReward.expGained} EXP / +{dropReward.gcoinGained} G</div>
                {dropReward.unlockedPart ? (
                  <div className="text-yellow-300 font-mono text-xs mt-1">🧬 {dropReward.unlockedPart.emoji} {dropReward.unlockedPart.name} を回収</div>
                ) : (
                  <div className="text-red-300/80 font-mono text-xs mt-1">{dropReward.label}</div>
                )}
                <div className="text-red-500/60 text-[10px] font-mono mt-3 neon-flicker">ルート切断中… 自動ログアウト</div>
              </div>
            ) : (
              <div className="border border-red-500/60 rounded-2xl p-6 bg-black/70">
                <div className="text-4xl mb-2 animate-pulse">🔴</div>
                <div className="text-red-400 font-black text-base tracking-widest mb-1 neon-flicker">SECRET DROP DETECTED</div>
                <div className="text-red-300/80 text-xs leading-relaxed mb-4 font-mono">
                  海外の学習サーバーへのハッキングルートが<span className="text-red-400 font-bold">60秒間だけ</span>開放された。
                  レア・アセットを1タップでサルベージ(回収)せよ。
                </div>
                <div className="text-red-300 font-mono text-3xl font-black mb-4">{dropCountdown}<span className="text-sm">s</span></div>
                <button
                  onClick={claimDrop}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl text-sm tracking-widest active:scale-95 transition-transform"
                >
                  ▸ SALVAGE ◂
                </button>
                <button onClick={() => setDropOverlay(false)} className="mt-3 text-red-700 text-[10px] font-mono">ルートを無視する</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GHOST 略奪成功 ──────────────────────────────────────── */}
      {ghostWin && (
        <div className="fixed inset-0 z-[95] bg-black/85 flex items-center justify-center p-6">
          <CodeRain color="#d946ef" opacity={0.2} />
          <div className="relative z-10 w-full max-w-sm text-center reward-pop border border-fuchsia-500/60 rounded-2xl p-6 bg-black/70">
            <div className="text-5xl mb-2">{ghostWin.emoji}</div>
            <div className="text-fuchsia-300 font-black text-lg mb-1 neon-flicker">略奪成功 / HACK COMPLETE</div>
            <div className="text-fuchsia-200 font-mono text-sm">{ghostWin.name} を奪い取った！</div>
          </div>
        </div>
      )}

      {/* ── CORE SYSTEM DOWN グリッチ演出 ─────────────────────────── */}
      {mfHackOverlay && (
        <div className="fixed inset-0 z-[96] bg-black flex items-center justify-center p-6">
          <CodeRain color="#f43f5e" opacity={0.3} />
          <div className="relative z-10 text-center">
            <div className="text-rose-400 font-black text-3xl tracking-widest neon-flicker mb-2">SYSTEM DOWN</div>
            <div className="text-emerald-300 font-black text-xl tracking-widest neon-flicker">HACK SUCCESS</div>
            <div className="text-rose-500/70 font-mono text-[10px] mt-4">大人の経済システムを、自分の頭脳だけで圧倒した。</div>
          </div>
        </div>
      )}

      {/* ── JUNK 密造成功 ──────────────────────────────────────── */}
      {craftResult && (
        <div className="fixed inset-0 z-[95] bg-black/85 flex items-center justify-center p-6">
          <CodeRain color="#84cc16" opacity={0.2} />
          <div className="relative z-10 w-full max-w-sm text-center reward-pop border border-lime-500/60 rounded-2xl p-6 bg-black/70">
            <div className="text-5xl mb-2">{craftResult.emoji}</div>
            <div className="text-lime-300 font-black text-lg mb-1 neon-flicker">密造成功 / CRAFTED</div>
            <div className="text-lime-200 font-mono text-sm mb-2">{craftResult.name}</div>
            {craftResult.vocab && (
              <div className="inline-block border border-lime-600/50 rounded-lg px-3 py-1.5 mt-1">
                <div className="text-lime-300 font-mono text-xs font-bold">📖 {craftResult.vocab.word}</div>
                <div className="text-lime-500 font-mono text-[10px]">{craftResult.vocab.meaning}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
