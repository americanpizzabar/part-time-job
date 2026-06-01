"use client";

import { useState, useEffect, useCallback } from "react";
import { formatJPY } from "@/lib/dateUtils";
import { projectProgress, boostPerContribution } from "@/lib/optis";
import BoostSequence from "@/components/BoostSequence";

interface Contribution {
  id: number;
  amount: number;
  type: string;
  boostStatus: string | null;
  date: string;
}

interface Project {
  id: number;
  name: string;
  imageUrl: string | null;
  targetAmount: number;
  selfTarget: number;
  parentBoostTotal: number;
  plannedAmount: number;
  selfSaved: number;
  boostReleased: number;
  status: string;
  parentMessage: string | null;
  contributions: Contribution[];
  boostPerStep: number;
  pendingBoostCount: number;
  remainingParentBoost: number;
}

interface NewProjectForm {
  name: string;
  targetAmount: string;
  selfTarget: string;
  parentBoostTotal: string;
  plannedAmount: string;
}

const EMPTY_FORM: NewProjectForm = {
  name: "",
  targetAmount: "",
  selfTarget: "",
  parentBoostTotal: "",
  plannedAmount: "",
};

function ProjectCard({ project, onContribute }: { project: Project; onContribute: (p: Project) => void }) {
  const prog = projectProgress(project);
  const boostStep = boostPerContribution(project.plannedAmount, project.selfTarget, project.parentBoostTotal);
  const pendingBoosts = project.contributions.filter(c => c.type === "SELF" && c.boostStatus === "PENDING");
  const statusColor: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    ACTIVE: "bg-green-100 text-green-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  const statusLabel: Record<string, string> = {
    PENDING: "申請中",
    ACTIVE: "進行中",
    COMPLETED: "達成！",
    REJECTED: "却下",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-2 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-xl flex-shrink-0">
          🎯
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-gray-800 truncate">{project.name}</h2>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColor[project.status] ?? "bg-gray-100 text-gray-500"}`}>
              {statusLabel[project.status] ?? project.status}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">目標 {formatJPY(project.targetAmount)}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xl font-extrabold text-emerald-600">{prog.progressPct}%</div>
          <div className="text-[11px] text-gray-400">{formatJPY(prog.total)}</div>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="px-4 pb-3">
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full flex overflow-hidden transition-all duration-700" style={{ width: `${prog.progressPct}%` }}>
            <div style={{ width: `${project.selfSaved / Math.max(1, prog.total) * 100}%` }} className="bg-emerald-500 transition-all" />
            <div style={{ width: `${project.boostReleased / Math.max(1, prog.total) * 100}%` }} className="bg-blue-400 transition-all" />
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>🟢 自分 {formatJPY(project.selfSaved)} / {formatJPY(project.selfTarget)}</span>
          <span>🔵 親ブースト {formatJPY(project.boostReleased)} / {formatJPY(project.parentBoostTotal)}</span>
        </div>
      </div>

      {/* 親メッセージ */}
      {project.parentMessage && (
        <div className="mx-4 mb-3 text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2">
          👪 {project.parentMessage}
        </div>
      )}

      {/* ブースト待ち通知 */}
      {project.status === "ACTIVE" && pendingBoosts.length > 0 && (
        <div className="mx-4 mb-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <span className="text-base">⚡</span>
          <span>計画通りの積立を検出！親ブースト +{formatJPY(boostStep)} の承認待ち中…</span>
        </div>
      )}

      {/* アクション */}
      {project.status === "ACTIVE" && !prog.completed && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onContribute(project)}
            className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
          >
            計画通りに {formatJPY(project.plannedAmount)} を積み立てる →
          </button>
        </div>
      )}
      {prog.completed && (
        <div className="px-4 pb-4 text-center text-emerald-600 font-bold text-sm">🎉 プロジェクト達成済み！</div>
      )}
      {project.status === "PENDING" && (
        <div className="px-4 pb-4 text-center text-yellow-600 text-xs">親の承認を待っています…</div>
      )}
      {project.status === "REJECTED" && (
        <div className="px-4 pb-4 text-center text-red-500 text-xs">却下されました。内容を変更して再申請できます。</div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewProjectForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [boostAnim, setBoostAnim] = useState<{ mode: "boost" | "complete"; amount?: number; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/projects").then(r => r.json());
    setProjects(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!form.name.trim() || !form.targetAmount) return;
    const target = Number(form.targetAmount);
    const self = Number(form.selfTarget || 0);
    const boost = Number(form.parentBoostTotal || 0);
    if (self + boost !== target) {
      alert(`自己原資(${formatJPY(self)}) + 親ブースト(${formatJPY(boost)}) = ${formatJPY(self + boost)} が目標額(${formatJPY(target)})と一致していません`);
      return;
    }
    setSaving(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        targetAmount: target,
        selfTarget: self,
        parentBoostTotal: boost,
        plannedAmount: Number(form.plannedAmount || 0),
      }),
    });
    setSaving(false);
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  }

  async function contribute(project: Project) {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CONTRIBUTE" }),
    });
    const data = await res.json();
    if (data.justCompleted) {
      setBoostAnim({ mode: "complete", name: project.name });
    } else if (project.parentBoostTotal > 0) {
      setBoostAnim({ mode: "boost", amount: project.boostPerStep, name: project.name });
    }
    load();
  }

  const active = projects.filter(p => p.status === "ACTIVE");
  const pending = projects.filter(p => p.status === "PENDING");
  const completed = projects.filter(p => p.status === "COMPLETED");
  const rejected = projects.filter(p => p.status === "REJECTED");

  return (
    <>
      {boostAnim && (
        <BoostSequence
          mode={boostAnim.mode}
          amount={boostAnim.amount}
          projectName={boostAnim.name}
          onClose={() => { setBoostAnim(null); load(); }}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">マイ・プロジェクト</h1>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-semibold bg-emerald-600 text-white px-4 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            + 新しいプロジェクト
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {active.length === 0 && pending.length === 0 && completed.length === 0 && rejected.length === 0 && (
              <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
                <div className="text-4xl mb-2">🎯</div>
                <p className="font-medium text-gray-700 mb-1">まだプロジェクトがありません</p>
                <p className="text-xs text-gray-400">欲しいものを登録して、計画的に達成しよう！</p>
              </div>
            )}

            {[...active, ...pending].length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-bold text-gray-600">進行中 / 申請中</div>
                {[...active, ...pending].map(p => (
                  <ProjectCard key={p.id} project={p} onContribute={contribute} />
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-bold text-gray-400">達成済み 🎉</div>
                {completed.map(p => (
                  <ProjectCard key={p.id} project={p} onContribute={contribute} />
                ))}
              </div>
            )}

            {rejected.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-bold text-gray-400">却下 / 再申請待ち</div>
                {rejected.map(p => (
                  <ProjectCard key={p.id} project={p} onContribute={contribute} />
                ))}
              </div>
            )}
          </>
        )}

        {/* 新規プロジェクト作成モーダル */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-800">新しいプロジェクトを申請</h2>

              <div>
                <label className="text-xs font-medium text-gray-600">欲しいもの・目標の名前</label>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="例: スケボー、部活のスパイク…"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">目標総額(円)</label>
                <input
                  type="number"
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="12000"
                  value={form.targetAmount}
                  onChange={e => setForm({ ...form, targetAmount: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">自己原資(円)</label>
                  <input
                    type="number"
                    className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    placeholder="8000"
                    value={form.selfTarget}
                    onChange={e => setForm({ ...form, selfTarget: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    親ブースト(円) <span className="text-emerald-500">⚡</span>
                  </label>
                  <input
                    type="number"
                    className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    placeholder="4000"
                    value={form.parentBoostTotal}
                    onChange={e => setForm({ ...form, parentBoostTotal: e.target.value })}
                  />
                </div>
              </div>

              {form.selfTarget && form.parentBoostTotal && form.targetAmount && (
                <p className={`text-xs px-3 py-2 rounded-lg ${
                  Number(form.selfTarget) + Number(form.parentBoostTotal) === Number(form.targetAmount)
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-500"
                }`}>
                  {Number(form.selfTarget) + Number(form.parentBoostTotal) === Number(form.targetAmount)
                    ? `✓ ${formatJPY(Number(form.selfTarget))} + ${formatJPY(Number(form.parentBoostTotal))} = ${formatJPY(Number(form.targetAmount))}`
                    : `合計 ${formatJPY(Number(form.selfTarget) + Number(form.parentBoostTotal))} ≠ 目標 ${formatJPY(Number(form.targetAmount))} → 再確認してね`
                  }
                </p>
              )}

              <div>
                <label className="text-xs font-medium text-gray-600">
                  1回に積み立てる計画額(円)
                  <span className="text-gray-400 ml-1">— 積み立てるたびに親ブーストが連動</span>
                </label>
                <input
                  type="number"
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="2000"
                  value={form.plannedAmount}
                  onChange={e => setForm({ ...form, plannedAmount: e.target.value })}
                />
                {form.plannedAmount && form.selfTarget && form.parentBoostTotal && (
                  <p className="text-xs text-gray-400 mt-1">
                    → 積み立て1回につき 親ブースト {formatJPY(
                      boostPerContribution(Number(form.plannedAmount), Number(form.selfTarget || 1), Number(form.parentBoostTotal))
                    )} が連動
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 font-semibold"
                >
                  キャンセル
                </button>
                <button
                  onClick={submit}
                  disabled={saving || !form.name.trim() || !form.targetAmount}
                  className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 font-semibold disabled:opacity-40"
                >
                  {saving ? "申請中…" : "申請する"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
