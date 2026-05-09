"use client";

import { useState, useEffect } from "react";
import { DAY_NAMES_JA, formatJPY } from "@/lib/dateUtils";

interface ChoreSchedule {
  id: number;
  scheduleType: string;
  daysOfWeek?: string | null;
  specificDates?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
}

interface Chore {
  id: number;
  name: string;
  amount: number;
  description?: string | null;
  isActive: boolean;
  schedules: ChoreSchedule[];
}

const SCHEDULE_TYPES = [
  { value: "NONE", label: "スケジュールなし" },
  { value: "DAILY", label: "毎日" },
  { value: "WEEKLY", label: "曜日指定" },
  { value: "SPECIFIC", label: "日付指定" },
];

function ScheduleBadge({ schedule }: { schedule: ChoreSchedule }) {
  if (schedule.scheduleType === "DAILY") return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">毎日</span>;
  if (schedule.scheduleType === "WEEKLY") {
    const days: number[] = schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : [];
    return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{days.map(d => DAY_NAMES_JA[d]).join("・")}曜日</span>;
  }
  if (schedule.scheduleType === "SPECIFIC") {
    const dates: string[] = schedule.specificDates ? JSON.parse(schedule.specificDates) : [];
    return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{dates.length}日指定</span>;
  }
  return null;
}

interface ChoreFormData {
  name: string;
  amount: string;
  description: string;
  scheduleType: string;
  daysOfWeek: number[];
  specificDates: string;
  startDate: string;
  endDate: string;
}

const defaultForm: ChoreFormData = {
  name: "", amount: "", description: "",
  scheduleType: "NONE", daysOfWeek: [], specificDates: "", startDate: "", endDate: "",
};

export default function ChoresPage() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [form, setForm] = useState<ChoreFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const fetchChores = () => fetch("/api/chores").then(r => r.json()).then(setChores);
  useEffect(() => { fetchChores(); }, []);

  function openAdd() {
    setEditingChore(null);
    setForm(defaultForm);
    setShowForm(true);
  }

  function openEdit(chore: Chore) {
    setEditingChore(chore);
    const schedule = chore.schedules.find(s => s.isActive);
    setForm({
      name: chore.name,
      amount: String(chore.amount),
      description: chore.description ?? "",
      scheduleType: schedule?.scheduleType ?? "NONE",
      daysOfWeek: schedule?.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : [],
      specificDates: schedule?.specificDates ? JSON.parse(schedule.specificDates).join("\n") : "",
      startDate: schedule?.startDate ?? "",
      endDate: schedule?.endDate ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name || !form.amount) return;
    setSaving(true);
    try {
      let choreId = editingChore?.id;
      if (editingChore) {
        await fetch(`/api/chores/${editingChore.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, amount: Number(form.amount), description: form.description }),
        });
      } else {
        const res = await fetch("/api/chores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, amount: Number(form.amount), description: form.description }),
        });
        const data = await res.json();
        choreId = data.id;
      }

      if (editingChore) {
        for (const s of editingChore.schedules) {
          await fetch(`/api/schedules/${s.id}`, { method: "DELETE" });
        }
      }

      if (form.scheduleType !== "NONE" && choreId) {
        await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            choreId,
            scheduleType: form.scheduleType,
            daysOfWeek: form.scheduleType === "WEEKLY" ? form.daysOfWeek : undefined,
            specificDates: form.scheduleType === "SPECIFIC"
              ? form.specificDates.split("\n").map(s => s.trim()).filter(Boolean)
              : undefined,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
          }),
        });
      }

      await fetchChores();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(chore: Chore) {
    await fetch(`/api/chores/${chore.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !chore.isActive }),
    });
    fetchChores();
  }

  async function handleDelete(chore: Chore) {
    if (!confirm(`「${chore.name}」を削除しますか？`)) return;
    await fetch(`/api/chores/${chore.id}`, { method: "DELETE" });
    fetchChores();
  }

  const displayed = chores.filter(c => showInactive ? true : c.isActive);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">お手伝いリスト</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          追加
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
        無効なお手伝いも表示
      </label>

      <div className="space-y-3">
        {displayed.map(chore => (
          <div key={chore.id} className={`bg-white rounded-xl border p-4 ${chore.isActive ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{chore.name}</span>
                  {!chore.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">無効</span>}
                </div>
                {chore.description && <p className="text-sm text-gray-500 mt-0.5">{chore.description}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-sm font-medium text-blue-600">{formatJPY(chore.amount)}/回</span>
                  {chore.schedules.filter(s => s.isActive).map(s => (
                    <ScheduleBadge key={s.id} schedule={s} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(chore)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => handleToggleActive(chore)} className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={chore.isActive ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                  </svg>
                </button>
                <button onClick={() => handleDelete(chore)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="text-center text-gray-400 py-12">お手伝いがまだ登録されていません</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">{editingChore ? "お手伝いを編集" : "お手伝いを追加"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名前 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：お皿洗い"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金額（円）*</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="任意"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">スケジュール</label>
                <div className="grid grid-cols-2 gap-2">
                  {SCHEDULE_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setForm(f => ({ ...f, scheduleType: type.value }))}
                      className={`p-2.5 rounded-lg text-sm font-medium border transition-all
                        ${form.scheduleType === type.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.scheduleType === "WEEKLY" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">曜日を選択</label>
                  <div className="flex gap-2">
                    {DAY_NAMES_JA.map((name, i) => (
                      <button
                        key={i}
                        onClick={() => setForm(f => ({
                          ...f,
                          daysOfWeek: f.daysOfWeek.includes(i)
                            ? f.daysOfWeek.filter(d => d !== i)
                            : [...f.daysOfWeek, i].sort()
                        }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                          ${form.daysOfWeek.includes(i) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}
                          ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.scheduleType === "SPECIFIC" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日付（1行に1日付 YYYY-MM-DD）</label>
                  <textarea
                    value={form.specificDates}
                    onChange={e => setForm(f => ({ ...f, specificDates: e.target.value }))}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder={"2026-05-10\n2026-05-17"}
                  />
                </div>
              )}

              {form.scheduleType !== "NONE" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">開始日（任意）</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">終了日（任意）</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.amount}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
