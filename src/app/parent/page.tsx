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
  const { role, mounted } = useRole();

  const { start, end } = currentMonthRange();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, p, l, pr, outs, ls] = await Promise.all([
        fetch(`/api/balance?monthStart=${start}&monthEnd=${end}`).then(r => r.json()),
        fetch("/api/presentations").then(r => r.json()),
        fetch(`/api/transactions?category=昼食&startDate=${start}&endDate=${end}`).then(r => r.json()),
        fetch("/api/projects").then(r => r.json()),
        fetch("/api/outcome").then(r => r.json()),
        fetch("/api/loan").then(r => r.json()),
      ]);
      setBalance(b);
      setPresentations(p);
      setLunches((l as LunchRecord[]).filter((t: LunchRecord) => t.imageUrl));
      setProjects(pr);
      setOutcomeReports((outs as OutcomeReport[]).filter(o => o.status === "PENDING"));
      setLoans((ls as FamilyLoan[]).filter(loan => loan.status === "PENDING" || loan.status === "ACTIVE"));
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        </>
      )}
    </div>
    </>
  );
}
