"use client";

import { useState, useEffect, useCallback } from "react";
import { formatJPY, currentMonthRange } from "@/lib/dateUtils";
import { STATUS_LABELS, STATUS_COLORS, needsWantsFeedback } from "@/lib/budget";
import NeedsWantsPie from "@/components/NeedsWantsPie";
import MissionManager from "@/components/MissionManager";
import BoostSequence from "@/components/BoostSequence";
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
  // Quiz
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState(["", "", ""]);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizExplain, setQuizExplain] = useState("");
  const [quizPosting, setQuizPosting] = useState(false);
  const [quizMsg, setQuizMsg] = useState("");
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
      setLunches((l as LunchRecord[]).filter((t: LunchRecord) => t.imageUrl));
      setProjects(pr);
      setOutcomeReports((outs as OutcomeReport[]).filter(o => o.status === "PENDING"));
      setLoans((ls as FamilyLoan[]).filter(loan => loan.status === "PENDING" || loan.status === "ACTIVE"));
      setFund(fd);
      // キーワードも取得(全日付)
      fetch("/api/keyword/all").then(r => r.json()).then(setKeywords).catch(() => {});
      fetch("/api/learning").then(r => r.json()).then(setLearningProfile).catch(() => {});
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

  async function postQuiz() {
    if (!quizQuestion.trim() || quizOptions.some(o => !o.trim()) || !quizExplain.trim()) return;
    setQuizPosting(true);
    const r = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: quizQuestion,
        options: quizOptions,
        correctIndex: quizCorrect,
        explanation: quizExplain,
        weatherType,
      }),
    });
    const data = await r.json();
    setQuizMsg(r.ok ? `✅ クイズを作成しました (ID: ${data.id})` : `❌ ${data.error}`);
    setQuizQuestion(""); setQuizOptions(["", "", ""]); setQuizExplain("");
    setQuizPosting(false);
    setTimeout(() => setQuizMsg(""), 3000);
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

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
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

          {/* 現在のラーニングレイヤー表示 */}
          {learningProfile && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
              <div className="text-2xl">🧠</div>
              <div>
                <div className="text-xs text-gray-500">現在のラーニングレイヤー</div>
                <div className="font-bold text-gray-800">Layer {learningProfile.layer}: {learningProfile.layerLabel}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-gray-500">エンカウント率</div>
                <div className="font-bold text-blue-600">{Math.round(learningProfile.encounterRate * 100)}%</div>
              </div>
            </div>
          )}

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

          {/* 時事クイズ作成 */}
          <div>
            <h2 className="font-bold text-gray-800 mb-2">🧠 時事クイズ作成</h2>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500">問題文</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
                  placeholder="例: インフレとは何を意味しますか？"
                  value={quizQuestion}
                  onChange={e => setQuizQuestion(e.target.value)}
                />
              </div>
              {quizOptions.map((opt, i) => (
                <div key={i}>
                  <label className="text-xs text-gray-500">
                    選択肢 {i + 1} {quizCorrect === i && <span className="text-green-600">(正解)</span>}
                  </label>
                  <div className="flex gap-2 mt-1">
                    <input
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      value={opt}
                      onChange={e => {
                        const newOpts = [...quizOptions];
                        newOpts[i] = e.target.value;
                        setQuizOptions(newOpts);
                      }}
                    />
                    <button
                      onClick={() => setQuizCorrect(i)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border ${quizCorrect === i ? "bg-green-100 border-green-400 text-green-700" : "border-gray-200 text-gray-400"}`}
                    >
                      正解
                    </button>
                  </div>
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500">解説</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
                  placeholder="正解後に表示される解説"
                  value={quizExplain}
                  onChange={e => setQuizExplain(e.target.value)}
                />
              </div>
              {quizMsg && <div className="text-sm text-blue-700 bg-blue-50 rounded-xl px-3 py-2">{quizMsg}</div>}
              <button
                onClick={postQuiz}
                disabled={quizPosting || !quizQuestion.trim() || quizOptions.some(o => !o.trim()) || !quizExplain.trim()}
                className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-40"
              >
                {quizPosting ? "作成中…" : "クイズを作成する"}
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
        </>
      )}
    </div>
    </>
  );
}
