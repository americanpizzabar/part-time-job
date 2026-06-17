"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatJPY, currentMonthRange } from "@/lib/dateUtils";
import { STATUS_LABELS, STATUS_COLORS, needsWantsFeedback } from "@/lib/budget";
import NeedsWantsPie from "@/components/NeedsWantsPie";
import MissionManager from "@/components/MissionManager";
import BoostSequence from "@/components/BoostSequence";
import AccuracyRadar from "@/components/AccuracyRadar";
import ChildSwitcher from "@/components/ChildSwitcher";
import FamilyIncentivePanel from "@/components/FamilyIncentivePanel";
import { useRole } from "@/lib/useRole";
import { projectProgress, boostPerContribution } from "@/lib/optis";

interface Balance {
  wallet: number;
  free: number;
  saved: number;
  month: {
    needs: number;
    wants: number;
    total: number;
    income: number;
    expense: number;
    needsRatio: number;
    wantsRatio: number;
  };
}

interface Presentation {
  id: number;
  itemName: string;
  reason: string;
  totalAmount: number;
  selfAmount: number;
  requestAmount: number;
  status: string;
  parentMessage: string | null;
  imageUrl: string | null;
}

interface ProjectItem {
  id: number;
  name: string;
  targetAmount: number;
  selfTarget: number;
  parentBoostTotal: number;
  plannedAmount: number;
  selfSaved: number;
  boostReleased: number;
  status: string;
  parentMessage: string | null;
  pendingBoostCount: number;
  boostPerStep: number;
  remainingParentBoost: number;
}

interface LunchRecord {
  id: number;
  date: string;
  amount: number;
  memo: string | null;
  imageUrl: string | null;
  createdAt: string;
}

interface FamilyLoan {
  id: number;
  purpose: string;
  principal: number;
  months: number;
  monthlyPayment: number;
  interestPerMonth: number;
  paidMonths: number;
  status: string;
  parentNote: string | null;
  createdAt: string;
}

interface OutcomeReport {
  id: number;
  projectId: number;
  content: string;
  metric: string | null;
  photoUrl: string | null;
  imageUrl: string | null;
  status: string;
  rewardPartId: string | null;
  project: { name: string };
}

const GENRE_META: Record<string, { label: string; emoji: string; color: string }> = {
  CURRENT: { label: "時事・社会", emoji: "📰", color: "#38bdf8" },
  ECONOMY: { label: "経済・金融", emoji: "💹", color: "#34d399" },
  ENGLISH: { label: "国際・英語", emoji: "🌐", color: "#a78bfa" },
  LOGIC: { label: "ロジカル思考", emoji: "🧩", color: "#fb923c" },
};

const LAYER_GRADE: Record<number, string> = {
  1: "高校受験",
  2: "大学受験",
  3: "ビジネス/GMAT",
};

const LEVEL_CAP_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "制限なし(自動)" },
  { value: 1, label: "高校生まで" },
  { value: 2, label: "大学生まで" },
  { value: 3, label: "大人まで" },
];

export default function ParentPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [lunches, setLunches] = useState<LunchRecord[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [outcomeReports, setOutcomeReports] = useState<OutcomeReport[]>([]);
  const [loans, setLoans] = useState<FamilyLoan[]>([]);
  const [loanMsg, setLoanMsg] = useState<Record<number, string>>({});
  const [loanInterest, setLoanInterest] = useState<Record<number, string>>({});
  const [learningProfile, setLearningProfile] = useState<{layer:number;layerLabel:string;encounterRate:number;parentAlertAt:string|null;parentBoosted:boolean} | null>(null);
  const [learnSettings, setLearnSettings] = useState<{genreCurrent:boolean;genreEconomy:boolean;genreEnglish:boolean;genreLogic:boolean;levelCap:number;layer:number;layerLabel:string} | null>(null);
  const [history, setHistory] = useState<{id:number;date:string;correct:boolean;layer:number;genre:string;questionText:string|null;selectedAnswer:string|null;correctAnswer:string|null;explanation:string|null}[]>([]);
  const [accuracy, setAccuracy] = useState<{genres:{genre:string;label:string;total:number;correct:number;accuracy:number}[];overall:{total:number;correct:number;accuracy:number}} | null>(null);
  const [boostAmount, setBoostAmount] = useState("3000");
  const [boostMsg, setBoostMsg] = useState("");
  const [feedTitle, setFeedTitle] = useState("");
  const [feedBody, setFeedBody] = useState("");
  const [feedCategory, setFeedCategory] = useState("NEWS");
  const [feedBoostCat, setFeedBoostCat] = useState("");
  const [feedPosting, setFeedPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<Presentation | null>(null);
  const [message, setMessage] = useState("");
  const [boostAnim, setBoostAnim] = useState<{ mode: "boost" | "complete"; amount?: number; name: string } | null>(null);
  const [projectMsg, setProjectMsg] = useState<Record<number, string>>({});
  // Weather
  const [weatherType, setWeatherType] = useState("NEUTRAL");
  const [weatherDesc, setWeatherDesc] = useState("");
  const [weatherPosting, setWeatherPosting] = useState(false);
  const [weatherMsg, setWeatherMsg] = useState("");
  // Fund
  const [fund, setFund] = useState<{ invested: number; currentValue: number; parentMatchRate: number; baseReturnRate: number } | null>(null);
  const [fundMatchRate, setFundMatchRate] = useState("");
  const [fundReturnRate, setFundReturnRate] = useState("");
  const [fundBonus, setFundBonus] = useState("");
  const [fundMsg, setFundMsg] = useState("");
  const [keywords, setKeywords] = useState<{id:number;word:string;english?:string;emoji:string;date:string}[]>([]);
  const [kwWord, setKwWord] = useState("");
  const [kwEnglish, setKwEnglish] = useState("");
  const [kwEmoji, setKwEmoji] = useState("💡");
  const [kwGradient, setKwGradient] = useState("economy");
  const [kwBody, setKwBody] = useState("");
  const [kwDate, setKwDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kwPosting, setKwPosting] = useState(false);
  const [kwMsg, setKwMsg] = useState("");
  const [backupInfo, setBackupInfo] = useState<{lastBackupAt:string|null;count:number;hasRestoreCode:boolean;autoSync:boolean;serverTime:string} | null>(null);
  const [restoreCode, setRestoreCode] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const { role, mounted } = useRole();

  const { start, end } = currentMonthRange();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, p, l, pr, outs, ls, fd] = await Promise.all([
        fetch(`/api/balance?monthStart=${start}&monthEnd=${end}`).then(r => r.json()),
        fetch("/api/presentations").then(r => r.json()),
        fetch(`/api/transactions?category=昼食&startDate=${start}&endDate=${end}`).then(r => r.json()),
        fetch("/api/projects").then(r => r.json()),
        fetch("/api/outcome").then(r => r.json()),
        fetch("/api/loan").then(r => r.json()),
        fetch("/api/fund").then(r => r.json()),
      ]);
      setBalance(b);
      setPresentations(p);
      const photos = (l as LunchRecord[]).filter((t: LunchRecord) => t.imageUrl);
      setLunches(photos);
      // 親がお昼セクションをロードした = 既読とみなし、通知バナーをリセット
      const latestCreatedAt = photos.reduce<string | null>(
        (acc, t) => (!acc || t.createdAt > acc ? t.createdAt : acc),
        null
      );
      localStorage.setItem("optis_lunch_seen_at", latestCreatedAt ?? new Date().toISOString());
      setProjects(pr);
      setOutcomeReports((outs as OutcomeReport[]).filter(o => o.status === "PENDING"));
      setLoans((ls as FamilyLoan[]).filter(loan => loan.status === "PENDING" || loan.status === "ACTIVE"));
      setFund(fd);
      // キーワードも取得(全日付)
      fetch("/api/keyword/all").then(r => r.json()).then(setKeywords).catch(() => {});
      fetch("/api/learning").then(r => r.json()).then(setLearningProfile).catch(() => {});
      fetch("/api/learning/settings").then(r => r.json()).then(setLearnSettings).catch(() => {});
      fetch("/api/learning/history").then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : (d?.rows ?? []))).catch(() => {});
      fetch("/api/learning/accuracy").then(r => r.json()).then(d => setAccuracy(Array.isArray(d?.genres) ? d : null)).catch(() => {});
      fetch("/api/backup").then(r=>r.json()).then(setBackupInfo).catch(()=>{});
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    fetchData();
    // 親セッションをマーク: ホーム画面でキーワードタップ時のポイント付与を抑制
    sessionStorage.setItem("parentSession", "1");
  }, [fetchData]);

  async function respond(p: Presentation, status: string) {
    await fetch(`/api/presentations/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, parentMessage: message || undefined }),
    });
    setResponding(null);
    setMessage("");
    fetchData();
  }

  async function respondProject(projectId: number, action: "APPROVE" | "REJECT") {
    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, message: projectMsg[projectId] ?? undefined }),
    });
    setProjectMsg(m => ({ ...m, [projectId]: "" }));
    fetchData();
  }

  async function respondLoan(id: number, action: "APPROVE" | "REJECT" | "REPAY") {
    const ipm = Number(loanInterest[id] ?? 0);
    await fetch(`/api/loan/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, interestPerMonth: ipm, parentNote: loanMsg[id] ?? undefined }),
    });
    fetchData();
  }

  async function postWeather() {
    if (!weatherDesc.trim()) return;
    setWeatherPosting(true);
    const r = await fetch("/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: weatherType, description: weatherDesc }),
    });
    const data = await r.json();
    setWeatherMsg(r.ok ? `✅ 経済ウェザーを設定しました: ${weatherType}` : `❌ ${data.error}`);
    setWeatherDesc("");
    setWeatherPosting(false);
    setTimeout(() => setWeatherMsg(""), 3000);
  }

  async function saveFundSettings() {
    const r = await fetch("/api/fund/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentMatchRate: fundMatchRate ? Number(fundMatchRate) : undefined,
        baseReturnRate: fundReturnRate ? Number(fundReturnRate) : undefined,
      }),
    });
    const data = await r.json();
    setFundMsg(r.ok ? "✅ ファンド設定を保存しました" : `❌ ${data.error}`);
    fetchData();
    setTimeout(() => setFundMsg(""), 3000);
  }

  async function addFundBonus() {
    const amt = Number(fundBonus);
    if (!amt || amt <= 0) return;
    const r = await fetch("/api/fund/bonus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amt }),
    });
    const data = await r.json();
    setFundMsg(r.ok ? `✅ 親ボーナス +${amt.toLocaleString()}円 を追加しました` : `❌ ${data.error}`);
    setFundBonus("");
    fetchData();
    setTimeout(() => setFundMsg(""), 3000);
  }

  async function postFeed() {
    if (!feedTitle.trim() || !feedBody.trim()) return;
    setFeedPosting(true);
    const effectJson = feedCategory === "BOOST" && feedBoostCat
      ? JSON.stringify({ type: "exp_multiplier", category: feedBoostCat, multiplier: 2 })
      : undefined;
    await fetch("/api/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: feedTitle, body: feedBody, category: feedCategory, effectJson }),
    });
    setFeedTitle(""); setFeedBody(""); setFeedBoostCat("");
    setFeedPosting(false);
  }

  async function respondOutcome(id: number, action: "APPROVE" | "REJECT") {
    await fetch(`/api/outcome/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    fetchData();
  }

  async function boostProject(project: ProjectItem) {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "BOOST" }),
    });
    const data = await res.json();
    if (res.ok) {
      setBoostAnim({
        mode: data.justCompleted ? "complete" : "boost",
        amount: data.boostAmount,
        name: project.name,
      });
    }
    fetchData();
  }

  async function postKeyword() {
    if (!kwWord || !kwBody || !kwDate) return;
    setKwPosting(true);
    setKwMsg("");
    try {
      await fetch("/api/keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: kwWord, english: kwEnglish || undefined, emoji: kwEmoji, gradient: kwGradient, body: kwBody, date: kwDate }),
      });
      setKwWord(""); setKwEnglish(""); setKwBody(""); setKwEmoji("💡");
      setKwMsg("登録しました");
      fetch("/api/keyword/all").then(r => r.json()).then(setKeywords).catch(() => {});
    } finally {
      setKwPosting(false);
    }
  }

  async function updateLearnSettings(patch: Partial<{genreCurrent:boolean;genreEconomy:boolean;genreEnglish:boolean;genreLogic:boolean;levelCap:number}>) {
    await fetch("/api/learning/settings", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(patch) });
    fetch("/api/learning/settings").then(r=>r.json()).then(setLearnSettings).catch(()=>{});
  }

  async function issueRestoreCode() {
    setBackupBusy(true);
    try {
      const res = await fetch("/api/backup", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ note:"親発行", issueCode:true }) });
      const data = await res.json();
      setRestoreCode(data.restoreCode ?? null);
      fetch("/api/backup").then(r=>r.json()).then(setBackupInfo).catch(()=>{});
    } finally { setBackupBusy(false); }
  }

  function formatBackupDate(s: string | null): string {
    if (!s) return "まだありません";
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString("ja-JP");
  }

  async function postBoost() {
    const amount = parseInt(boostAmount, 10);
    if (!amount || amount <= 0) return;
    await fetch("/api/learning/boost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    setBoostMsg(`¥${amount.toLocaleString()} の知性ブーストを送りました！`);
    fetch("/api/learning").then(r => r.json()).then(setLearningProfile).catch(() => {});
  }

  const pending = presentations.filter(p => p.status === "PENDING" || p.status === "HOLD");
  const pendingProjects = projects.filter(p => p.status === "PENDING");
  const activeProjects = projects.filter(p => p.status === "ACTIVE");

  if (mounted && role === "CHILD") {
    return (
      <div className="text-center text-gray-400 py-16 space-y-2">
        <div className="text-4xl">🔒</div>
        <p className="text-sm">この画面は親専用です。</p>
        <p className="text-xs">設定で利用者を「親」に切り替えると表示されます。</p>
      </div>
    );
  }

  return (
    <>
      {boostAnim && (
        <BoostSequence
          mode={boostAnim.mode}
          amount={boostAnim.amount}
          projectName={boostAnim.name}
          onClose={() => { setBoostAnim(null); fetchData(); }}
        />
      )}
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">親ビュー</h1>
        <p className="text-sm text-gray-500 mt-1">
          お子さんのプライバシーに配慮し、表示は残高・総額・割合のみです。
          個別の購入履歴（非公開設定分）は表示されません。
        </p>
      </div>

      {/* コックピット型 子供切り替えタブ(子が2人以上のとき表示) */}
      <ChildSwitcher onSwitch={fetchData} />

      {/* ファミリー・インセンティブ(一括ブースト + きょうだいバトル) */}
      <FamilyIncentivePanel />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* 昼食の記録 */}
          <div>
            <h2 className="font-bold text-gray-800 mb-2">今月の昼食</h2>
            {lunches.length === 0 ? (
              <div className="text-center text-gray-400 py-8 bg-white rounded-xl border border-gray-200">
                写真付きの昼食記録はありません
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {lunches.map(l => (
                  <div key={l.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.imageUrl!} alt="昼食" className="w-full h-28 object-cover" />
                    <div className="p-2">
                      <div className="text-xs text-gray-500">{l.date}</div>
                      <div className="text-sm font-bold text-gray-700">{formatJPY(l.amount)}</div>
                      {l.memo && <div className="text-xs text-gray-400 truncate">{l.memo}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 残高サマリー */}
          {balance && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <div className="text-xs text-gray-500">財布残高</div>
                  <div className="text-base font-bold text-gray-800 mt-0.5">{formatJPY(balance.wallet)}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <div className="text-xs text-gray-500">今月の支出</div>
                  <div className="text-base font-bold text-red-500 mt-0.5">{formatJPY(balance.month.expense)}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <div className="text-xs text-gray-500">貯金中</div>
                  <div className="text-base font-bold text-indigo-600 mt-0.5">{formatJPY(balance.saved)}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-bold text-gray-800 mb-4">今月のNeeds / Wants</h3>
                <NeedsWantsPie
                  needs={balance.month.needs}
                  wants={balance.month.wants}
                  needsRatio={balance.month.needsRatio}
                  wantsRatio={balance.month.wantsRatio}
                />
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  💡 {needsWantsFeedback(balance.month.needsRatio, balance.month.wantsRatio, balance.month.total)}
                </div>
              </div>
            </>
          )}

          {/* 学習レイヤー達成アラート */}
          {learningProfile?.parentAlertAt && !learningProfile.parentBoosted && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">🧬</div>
                <div className="flex-1">
                  <div className="font-bold text-amber-800 mb-1">知性進化レポート 🎓</div>
                  <p className="text-sm text-amber-700 mb-3">
                    お子様の時事・経済知識が<strong>【{learningProfile.layerLabel}レベル】</strong>に到達しました。
                    Optisが自律進化中です。この成長に知性ブースト投資を実行しますか？
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={boostAmount}
                      onChange={e => setBoostAmount(e.target.value)}
                      className="border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="1000">¥1,000</option>
                      <option value="2000">¥2,000</option>
                      <option value="3000">¥3,000 (推奨)</option>
                      <option value="5000">¥5,000</option>
                    </select>
                    <button
                      onClick={postBoost}
                      className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-600"
                    >
                      💰 知性ブースト投資
                    </button>
                  </div>
                  {boostMsg && <p className="text-green-600 text-sm mt-2 font-medium">{boostMsg}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ─── 自動学習管理ダッシュボード ─── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧠</span>
              <h2 className="font-bold text-gray-800">自動学習管理</h2>
            </div>

            {/* Section A: 出題範囲 & レベル管理設定 */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <h3 className="font-bold text-gray-800 text-sm">出題範囲 &amp; レベル管理</h3>

              {/* ジャンルトグル */}
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["genreCurrent", "CURRENT"],
                  ["genreEconomy", "ECONOMY"],
                  ["genreEnglish", "ENGLISH"],
                  ["genreLogic", "LOGIC"],
                ] as const).map(([key, gkey]) => {
                  const meta = GENRE_META[gkey];
                  const on = learnSettings ? learnSettings[key] : false;
                  return (
                    <button
                      key={key}
                      disabled={!learnSettings}
                      onClick={() => updateLearnSettings({ [key]: !on } as Partial<{genreCurrent:boolean;genreEconomy:boolean;genreEnglish:boolean;genreLogic:boolean}>)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? "border-transparent" : "border-gray-200 bg-gray-50"}`}
                      style={on ? { backgroundColor: `${meta.color}1a`, borderColor: meta.color } : undefined}
                    >
                      <span className="text-lg">{meta.emoji}</span>
                      <span className={`flex-1 text-xs font-bold ${on ? "text-gray-800" : "text-gray-400"}`}>{meta.label}</span>
                      <span
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${on ? "" : "bg-gray-300"}`}
                        style={on ? { backgroundColor: meta.color } : undefined}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-1"}`} />
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* レベルキャップ */}
              <div>
                <div className="text-xs text-gray-500 mb-1.5">出題レベルの上限</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LEVEL_CAP_OPTIONS.map(opt => {
                    const active = learnSettings?.levelCap === opt.value;
                    return (
                      <button
                        key={opt.value}
                        disabled={!learnSettings}
                        onClick={() => updateLearnSettings({ levelCap: opt.value })}
                        className={`rounded-xl px-2 py-2 text-xs font-bold transition-colors ${active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {learnSettings && (
                <div className="rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                  現在の出題レベル: <strong>{learnSettings.layerLabel}</strong>
                </div>
              )}
            </div>

            {/* Section B: ジャンル別正答率 (レーダーチャート) */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-bold text-gray-800 text-sm mb-2">ジャンル別正答率</h3>
              {accuracy ? (
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-around">
                  <AccuracyRadar
                    data={(["ECONOMY", "CURRENT", "ENGLISH", "LOGIC"] as const).map(g => {
                      const found = accuracy.genres.find(x => x.genre === g);
                      return { label: GENRE_META[g].label, accuracy: found?.accuracy ?? 0 };
                    })}
                  />
                  <div className="text-center">
                    <div className="text-xs text-gray-500">総合正答率</div>
                    <div className="text-4xl font-bold text-indigo-600">{accuracy.overall.accuracy}%</div>
                    <div className="text-xs text-gray-400 mt-1">{accuracy.overall.correct} / {accuracy.overall.total} 問正解</div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-gray-400">正答率データを読み込み中…</div>
              )}
            </div>

            {/* Section C: 過去の出題履歴 */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-bold text-gray-800 text-sm mb-3">過去の出題履歴</h3>
              {history.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">まだ出題履歴がありません</div>
              ) : (
                <div className="space-y-2">
                  {history.map(h => {
                    const meta = GENRE_META[h.genre] ?? { label: h.genre, emoji: "❓", color: "#9ca3af" };
                    const q = h.questionText ?? "";
                    const truncated = q.length > 60 ? `${q.slice(0, 60)}…` : q;
                    let dateStr = h.date;
                    const d = new Date(h.date);
                    if (!isNaN(d.getTime())) {
                      dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    }
                    return (
                      <div key={h.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                            style={{ backgroundColor: meta.color }}
                          >
                            <span>{meta.emoji}</span>{meta.label}
                          </span>
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {LAYER_GRADE[h.layer] ?? `Layer ${h.layer}`}
                          </span>
                          <span className="ml-auto text-[11px] text-gray-400">{dateStr}</span>
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${h.correct ? "bg-emerald-500" : "bg-red-500"}`}
                          >
                            {h.correct ? "◯" : "×"}
                          </span>
                        </div>
                        {truncated && <p className="mt-2 text-sm text-gray-700">{truncated}</p>}
                        <div className="mt-1.5 text-xs text-gray-500">
                          あなたの解答: <span className={h.correct ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{h.selectedAnswer ?? "—"}</span>
                          {" / "}正解: <span className="text-gray-700 font-medium">{h.correctAnswer ?? "—"}</span>
                        </div>
                        {h.explanation && (
                          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">{h.explanation}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* マイ・プロジェクト 承認/ブースト */}
          {(pendingProjects.length > 0 || activeProjects.length > 0) && (
            <div>
              <h2 className="font-bold text-gray-800 mb-2">
                マイ・プロジェクト
                {pendingProjects.length > 0 && (
                  <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">{pendingProjects.length} 申請中</span>
                )}
              </h2>
              <div className="space-y-3">
                {[...pendingProjects, ...activeProjects].map(project => {
                  const prog = projectProgress(project);
                  const boostStep = boostPerContribution(project.plannedAmount, project.selfTarget, project.parentBoostTotal);
                  return (
                    <div key={project.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div>
                          <div className="font-bold text-gray-800">{project.name}</div>
                          <div className="text-xs text-gray-400">目標 {formatJPY(project.targetAmount)} / 自己 {formatJPY(project.selfTarget)} / ブースト {formatJPY(project.parentBoostTotal)}</div>
                        </div>
                      </div>

                      {/* プログレス */}
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
                        <div className="h-full rounded-full flex" style={{ width: `${prog.progressPct}%` }}>
                          <div style={{ width: `${project.selfSaved / Math.max(1, prog.total) * 100}%` }} className="bg-emerald-500" />
                          <div style={{ width: `${project.boostReleased / Math.max(1, prog.total) * 100}%` }} className="bg-blue-400" />
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-3">
                        <span>🟢 自己 {formatJPY(project.selfSaved)}</span>
                        <span>🔵 ブースト済 {formatJPY(project.boostReleased)} / {formatJPY(project.parentBoostTotal)}</span>
                      </div>

                      {/* PENDING: 承認 or 却下 */}
                      {project.status === "PENDING" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400"
                            placeholder="メッセージ(任意)"
                            value={projectMsg[project.id] ?? ""}
                            onChange={e => setProjectMsg(m => ({ ...m, [project.id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => respondProject(project.id, "APPROVE")} className="flex-1 bg-emerald-600 text-white rounded-xl py-2 text-sm font-semibold">承認 ✓</button>
                            <button onClick={() => respondProject(project.id, "REJECT")} className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold">却下</button>
                          </div>
                        </div>
                      )}

                      {/* ACTIVE: ブースト実行 */}
                      {project.status === "ACTIVE" && project.pendingBoostCount > 0 && (
                        <button
                          onClick={() => boostProject(project)}
                          className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-transform"
                        >
                          ⚡ 計画通りだね！ブースト実行 +{formatJPY(boostStep)}
                        </button>
                      )}
                      {project.status === "ACTIVE" && project.pendingBoostCount === 0 && (
                        <div className="text-center text-xs text-gray-400 py-1">積み立て待ち… (残ブースト {formatJPY(project.remainingParentBoost)})</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* エンジェル投資：成果報告の審査 */}
          {outcomeReports.length > 0 && (
            <div>
              <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                🏆 成果報告の審査
                <span className="text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full">{outcomeReports.length} 件</span>
              </h2>
              <div className="space-y-3">
                {outcomeReports.map(report => (
                  <div key={report.id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-base flex-shrink-0">📋</div>
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{report.project.name}</div>
                        <div className="text-[11px] text-violet-500 mt-0.5">承認でレアパーツ解放 + 信用スコア +8</div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl px-3 py-3 text-sm text-gray-700 leading-relaxed">
                      {report.content}
                    </div>

                    {report.metric && (
                      <div className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                        📊 {report.metric}
                      </div>
                    )}

                    {(report.photoUrl ?? report.imageUrl) && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={(report.photoUrl ?? report.imageUrl)!} alt="成果写真" className="w-full h-40 object-cover rounded-xl" />
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => respondOutcome(report.id, "APPROVE")}
                        className="flex-1 bg-violet-600 text-white rounded-xl py-2.5 text-sm font-bold active:scale-95 transition-transform"
                      >
                        承認 🏆
                      </button>
                      <button
                        onClick={() => respondOutcome(report.id, "REJECT")}
                        className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold active:scale-95 transition-transform"
                      >
                        却下
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ファミリー・クレジット ローン審査 */}
          {loans.length > 0 && (
            <div>
              <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                💳 ファミリー・ローン
                {loans.filter(l => l.status === "PENDING").length > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {loans.filter(l => l.status === "PENDING").length} 審査待ち
                  </span>
                )}
              </h2>
              <div className="space-y-3">
                {loans.map(loan => (
                  <div key={loan.id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-gray-800">{loan.purpose}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          融資額 {loan.principal.toLocaleString()}円 / {loan.months}ヶ月
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${loan.status === "PENDING" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                        {loan.status === "PENDING" ? "審査中" : `返済中 ${loan.paidMonths}/${loan.months}`}
                      </span>
                    </div>

                    {loan.status === "PENDING" && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">月利(円/月)</label>
                            <input
                              type="number"
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-0.5 focus:outline-none focus:border-blue-400"
                              placeholder="例: 100 (デフォルト0)"
                              value={loanInterest[loan.id] ?? ""}
                              onChange={e => setLoanInterest(m => ({ ...m, [loan.id]: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">月返済額(自動計算)</label>
                            <div className="border border-gray-200 rounded-xl px-3 py-2 text-sm mt-0.5 bg-gray-50 text-gray-600">
                              {(Math.ceil(loan.principal / loan.months) + Number(loanInterest[loan.id] ?? 0)).toLocaleString()}円
                            </div>
                          </div>
                        </div>
                        <input
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                          placeholder="コメント(任意)"
                          value={loanMsg[loan.id] ?? ""}
                          onChange={e => setLoanMsg(m => ({ ...m, [loan.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => respondLoan(loan.id, "APPROVE")} className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-bold">承認 ✓</button>
                          <button onClick={() => respondLoan(loan.id, "REJECT")} className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold">却下</button>
                        </div>
                      </div>
                    )}

                    {loan.status === "ACTIVE" && (
                      <div>
                        <div className="h-2 bg-gray-100 rounded-full mb-2">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${(loan.paidMonths / loan.months) * 100}%` }} />
                        </div>
                        <div className="text-xs text-gray-500 text-center mb-2">
                          残り{loan.months - loan.paidMonths}回 × {loan.monthlyPayment.toLocaleString()}円/月
                        </div>
                        <button onClick={() => respondLoan(loan.id, "REPAY")} className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-bold">
                          今月分の返済を記録 ({loan.monthlyPayment.toLocaleString()}円)
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* シャドウ・フィード 投稿 */}
          <div>
            <h2 className="font-bold text-gray-800 mb-2">📡 世界ハック・フィードを投稿</h2>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500">カテゴリ</label>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  value={feedCategory}
                  onChange={e => setFeedCategory(e.target.value)}
                >
                  <option value="NEWS">📡 ニュース</option>
                  <option value="ALERT">⚠️ アラート</option>
                  <option value="BOOST">⚡ ブースト(EXP増加)</option>
                  <option value="TREND">📈 トレンド</option>
                </select>
              </div>
              {feedCategory === "BOOST" && (
                <div>
                  <label className="text-xs text-gray-500">ブースト対象カテゴリ(例: 書籍・スポーツ)</label>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    placeholder="書籍"
                    value={feedBoostCat}
                    onChange={e => setFeedBoostCat(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500">タイトル</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  placeholder="例: 【速報】今月は家族で節約チャレンジ！"
                  value={feedTitle}
                  onChange={e => setFeedTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">本文</label>
                <textarea
                  rows={3}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
                  placeholder="子どもへのメッセージやゲーム内効果を書いてみよう"
                  value={feedBody}
                  onChange={e => setFeedBody(e.target.value)}
                />
              </div>
              <button
                onClick={postFeed}
                disabled={feedPosting || !feedTitle.trim() || !feedBody.trim()}
                className="w-full bg-purple-600 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-40"
              >
                {feedPosting ? "送信中…" : "フィードに投稿する"}
              </button>
            </div>
          </div>

          {/* 経済ウェザー設定 */}
          <div>
            <h2 className="font-bold text-gray-800 mb-2">🌤 経済ウェザー設定</h2>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500">ウェザータイプ</label>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  value={weatherType}
                  onChange={e => setWeatherType(e.target.value)}
                >
                  <option value="NEUTRAL">⛅ 平常</option>
                  <option value="INFLATION">🔥 インフレ警報 (×1.2)</option>
                  <option value="DEFLATION">❄️ デフレ注意 (×0.85)</option>
                  <option value="YEN_STRONG">💹 円高 (×0.8)</option>
                  <option value="YEN_WEAK">⚠️ 円安警報 (×1.15)</option>
                  <option value="RATE_HIKE">🏦 利上げ (×1.05)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">説明文</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  placeholder="例: 今月は物価が上昇しています"
                  value={weatherDesc}
                  onChange={e => setWeatherDesc(e.target.value)}
                />
              </div>
              {weatherMsg && <div className="text-sm text-blue-700 bg-blue-50 rounded-xl px-3 py-2">{weatherMsg}</div>}
              <button
                onClick={postWeather}
                disabled={weatherPosting || !weatherDesc.trim()}
                className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-40"
              >
                {weatherPosting ? "設定中…" : "ウェザーを設定する"}
              </button>
            </div>
          </div>

          {/* ジュニア・ファンド管理 */}
          <div>
            <h2 className="font-bold text-gray-800 mb-2">📈 ジュニア・ファンド管理</h2>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
              {fund && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-indigo-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-indigo-500">評価額</div>
                    <div className="text-base font-bold text-indigo-700 mt-0.5">{fund.currentValue.toLocaleString()}円</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-500">投資元本</div>
                    <div className="text-base font-bold text-gray-700 mt-0.5">{fund.invested.toLocaleString()}円</div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">親マッチ率 (%)</label>
                  <input
                    type="number"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    placeholder={`現在: ${fund?.parentMatchRate ?? 0}%`}
                    value={fundMatchRate}
                    onChange={e => setFundMatchRate(e.target.value)}
                    min={0} max={200}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">年利 (%)</label>
                  <input
                    type="number"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    placeholder={`現在: ${fund?.baseReturnRate ?? 5}%`}
                    value={fundReturnRate}
                    onChange={e => setFundReturnRate(e.target.value)}
                    min={0} max={50}
                  />
                </div>
              </div>
              <button
                onClick={saveFundSettings}
                className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold"
              >
                設定を保存
              </button>
              <div>
                <label className="text-xs text-gray-500">親ボーナスを手動追加(円)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    placeholder="例: 500"
                    value={fundBonus}
                    onChange={e => setFundBonus(e.target.value)}
                    min={1}
                  />
                  <button
                    onClick={addFundBonus}
                    disabled={!fundBonus || Number(fundBonus) <= 0}
                    className="bg-yellow-500 text-white rounded-xl px-4 text-sm font-bold disabled:opacity-40"
                  >
                    ボーナス
                  </button>
                </div>
              </div>
              {fundMsg && <div className="text-sm text-blue-700 bg-blue-50 rounded-xl px-3 py-2">{fundMsg}</div>}
            </div>
          </div>

          {/* シークレット・ミッション */}
          <MissionManager />

          {/* おねだり承認 */}
          <div>
            <h2 className="font-bold text-gray-800 mb-2">
              おねだりプレゼン
              {pending.length > 0 && (
                <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{pending.length}</span>
              )}
            </h2>
            {presentations.length === 0 ? (
              <div className="text-center text-gray-400 py-8 bg-white rounded-xl border border-gray-200">
                申請はありません
              </div>
            ) : (
              <div className="space-y-3">
                {presentations.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {p.imageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.imageUrl} alt={p.itemName} className="w-full h-36 object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-gray-800">{p.itemName}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1.5">{p.reason}</p>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="text-xs text-gray-400">総額</div>
                          <div className="text-sm font-bold text-gray-700">{formatJPY(p.totalAmount)}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="text-xs text-gray-400">本人負担</div>
                          <div className="text-sm font-bold text-gray-700">{formatJPY(p.selfAmount)}</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2">
                          <div className="text-xs text-blue-500">補助希望</div>
                          <div className="text-sm font-bold text-blue-700">{formatJPY(p.requestAmount)}</div>
                        </div>
                      </div>

                      {p.parentMessage && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                          {p.parentMessage}
                        </div>
                      )}

                      {responding?.id === p.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="応援メッセージやアドバイス（任意）"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => respond(p, "APPROVED")} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">承認</button>
                            <button onClick={() => respond(p, "HOLD")} className="flex-1 bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-600">保留</button>
                            <button onClick={() => respond(p, "REJECTED")} className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600">却下</button>
                          </div>
                          <button onClick={() => { setResponding(null); setMessage(""); }} className="w-full text-xs text-gray-400 py-1">キャンセル</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setResponding(p); setMessage(p.parentMessage ?? ""); }}
                          className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          {p.status === "PENDING" ? "返信する" : "ステータスを変更"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── 1日1キーワード管理 ─── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-3">📡 1日1キーワード管理</h2>
            <p className="text-xs text-gray-400 mb-3">※ ここで登録しても知性ポイントは加算されません。子供がホーム画面でタップした時のみ付与されます。</p>
            <div className="space-y-2 mb-3">
              <div className="flex gap-2">
                <input value={kwWord} onChange={e => setKwWord(e.target.value)} placeholder="キーワード (例: 円安)" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <input value={kwEnglish} onChange={e => setKwEnglish(e.target.value)} placeholder="英語 (任意)" className="w-32 border rounded-lg px-3 py-2 text-sm" />
                <input value={kwEmoji} onChange={e => setKwEmoji(e.target.value)} placeholder="絵文字" className="w-16 border rounded-lg px-3 py-2 text-sm text-center" />
              </div>
              <div className="flex gap-2">
                <select value={kwGradient} onChange={e => setKwGradient(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="economy">経済(青)</option>
                  <option value="tech">テック(紫)</option>
                  <option value="global">環境(緑)</option>
                  <option value="cyber">サイバー(赤黒)</option>
                  <option value="social">社会(鉄紺)</option>
                </select>
                <input type="date" value={kwDate} onChange={e => setKwDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <textarea value={kwBody} onChange={e => setKwBody(e.target.value)} placeholder="「ヤバさ」の説明 (1〜2行)" rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <button onClick={postKeyword} disabled={kwPosting || !kwWord || !kwBody} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-40">
                {kwPosting ? "登録中…" : "キーワードを登録"}
              </button>
              {kwMsg && <p className="text-green-600 text-xs text-center">{kwMsg}</p>}
            </div>
            {keywords.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">登録済みキーワード ({keywords.length}件)</p>
                {keywords.slice(0, 5).map(kw => (
                  <div key={kw.id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5">
                    <span>{kw.emoji}</span>
                    <span className="font-medium">{kw.word}</span>
                    {kw.english && <span className="text-gray-400 text-xs">{kw.english}</span>}
                    <span className="ml-auto text-xs text-gray-400">{kw.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── データ保存・バックアップ ─── */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
            <h2 className="font-bold text-gray-800">🔒 データ保存・バックアップ</h2>

            <div className="space-y-1">
              <div className="text-sm font-medium text-emerald-600">✅ クラウド自動保存：有効</div>
              <div className="text-sm text-gray-700">
                最終バックアップ: {formatBackupDate(backupInfo?.lastBackupAt ?? null)}
              </div>
              <p className="text-xs text-gray-400">
                すべてのデータはサーバー側にタイムスタンプ付きで保存されます（端末内には保存されないため改ざんできません）。
              </p>
            </div>

            <div>
              <button
                onClick={issueRestoreCode}
                disabled={backupBusy}
                className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-40"
              >
                {backupBusy ? "発行中…" : "🔑 復元コードを発行"}
              </button>
              {restoreCode && (
                <div className="mt-3 rounded-xl bg-indigo-50 border border-indigo-200 p-4 text-center space-y-2">
                  <div className="text-xs text-indigo-500">復元コード</div>
                  <div className="text-3xl font-bold tracking-widest text-indigo-700 select-all">{restoreCode}</div>
                  <button
                    onClick={() => navigator.clipboard?.writeText(restoreCode)}
                    className="bg-white border border-indigo-300 text-indigo-600 rounded-lg px-3 py-1.5 text-xs font-bold"
                  >
                    📋 コピー
                  </button>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    機種変更・紛失時はお子様の端末でこのコードを入力すると、育てたOptisを復元できます。
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href="/api/export/csv?range=all"
                className="block text-center bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-bold"
              >
                ⬇️ ライフデータをCSV出力
              </a>
              <Link
                href="/portfolio"
                className="block text-center bg-violet-600 text-white rounded-xl py-2.5 text-sm font-bold"
              >
                📤 ポートフォリオ(PDF)を作成
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
}
