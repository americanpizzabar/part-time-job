"use client";

import { useState, useEffect } from "react";
import { today, DAY_NAMES_JA } from "@/lib/dateUtils";
import { useRole } from "@/lib/useRole";

interface Config {
  allowance: { id: number; period: string; amount: number; startDate: string } | null;
  aggregation: { id: number; periodDays: number; startDayOfWeek: number; weeklyBudget: number | null } | null;
}

const PERIOD_LABELS: Record<string, string> = {
  WEEKLY: "週ごと",
  BIWEEKLY: "2週ごと",
  MONTHLY: "月ごと",
};

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [allowancePeriod, setAllowancePeriod] = useState("WEEKLY");
  const [allowanceAmount, setAllowanceAmount] = useState("");
  const [allowanceStart, setAllowanceStart] = useState(today());
  const [periodDays, setPeriodDays] = useState("7");
  const [startDayOfWeek, setStartDayOfWeek] = useState("1");
  const [weeklyBudget, setWeeklyBudget] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { role, setRole, mounted } = useRole();

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then((data: Config) => {
        setConfig(data);
        if (data.allowance) {
          setAllowancePeriod(data.allowance.period);
          setAllowanceAmount(String(data.allowance.amount));
          setAllowanceStart(data.allowance.startDate);
        }
        if (data.aggregation) {
          setPeriodDays(String(data.aggregation.periodDays));
          setStartDayOfWeek(String(data.aggregation.startDayOfWeek));
          setWeeklyBudget(data.aggregation.weeklyBudget != null ? String(data.aggregation.weeklyBudget) : "");
        }
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowance: allowanceAmount
            ? { period: allowancePeriod, amount: Number(allowanceAmount), startDate: allowanceStart }
            : undefined,
          aggregation: {
            periodDays: Number(periodDays),
            startDayOfWeek: Number(startDayOfWeek),
            weeklyBudget: weeklyBudget === "" ? null : Number(weeklyBudget),
          },
        }),
      });
      const data = await fetch("/api/config").then(r => r.json());
      setConfig(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">設定</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-bold text-gray-800">利用者</h2>
        <p className="text-xs text-gray-500">この端末を使う人を選んでください。「子供」を選ぶと親ビューは表示されません。</p>
        <div className="flex gap-2">
          {([
            { value: "PARENT", label: "親", icon: "👪" },
            { value: "CHILD", label: "子供", icon: "🧒" },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setRole(opt.value)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-all
                ${mounted && role === opt.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
            >
              <span className="mr-1">{opt.icon}</span>{opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-bold text-gray-800">基本お小遣い設定</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">支給周期</label>
          <div className="flex gap-2">
            {["WEEKLY", "BIWEEKLY", "MONTHLY"].map(p => (
              <button
                key={p}
                onClick={() => setAllowancePeriod(p)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                  ${allowancePeriod === p ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">金額（円）</label>
          <input
            type="number"
            value={allowanceAmount}
            onChange={e => setAllowanceAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="500"
            min="0"
          />
          <p className="text-xs text-gray-500 mt-1">お手伝いとは別に固定で支給される金額</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
          <input
            type="date"
            value={allowanceStart}
            onChange={e => setAllowanceStart(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-bold text-gray-800">集計期間設定</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">集計期間（日数）</label>
          <input
            type="number"
            value={periodDays}
            onChange={e => setPeriodDays(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="31"
          />
          <p className="text-xs text-gray-500 mt-1">デフォルトは7日（1週間）</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">週の開始曜日</label>
          <div className="flex gap-1.5">
            {DAY_NAMES_JA.map((name, i) => (
              <button
                key={i}
                onClick={() => setStartDayOfWeek(String(i))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                  ${startDayOfWeek === String(i) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}
                  ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">週予算（円）</label>
          <input
            type="number"
            value={weeklyBudget}
            onChange={e => setWeeklyBudget(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例: 1500（未設定なら宝箱なし）"
            min="0"
          />
          <p className="text-xs text-gray-500 mt-1">月〜土の支出がこの額以下なら、日曜にマイルストーン・チェスト（レアパーツ確定）が出現します</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3.5 rounded-xl font-semibold transition-colors text-sm
          ${saved ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}
          disabled:opacity-50`}
      >
        {saving ? "保存中..." : saved ? "✓ 保存しました" : "設定を保存する"}
      </button>

      {config?.allowance && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 mb-2">現在の設定</div>
          <div className="text-sm text-gray-700 space-y-1">
            <div>基本お小遣い: {config.allowance.amount}円 / {PERIOD_LABELS[config.allowance.period]}</div>
            <div>集計期間: {config.aggregation?.periodDays ?? 7}日</div>
            <div>週の開始: {DAY_NAMES_JA[config.aggregation?.startDayOfWeek ?? 1]}曜日</div>
          </div>
        </div>
      )}

      {mounted && role === "PARENT" && (
        <a
          href="/family"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
        >
          <span className="text-xl">👨‍👩‍👧</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800">家族の設定</div>
            <div className="text-xs text-gray-400">親・子の端末を追加、家族メンバーを管理</div>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </a>
      )}

      {mounted && role === "CHILD" && (
        <a
          href="/family/join"
          className="flex items-center gap-3 bg-green-50 rounded-xl border-2 border-green-200 p-4 hover:bg-green-100 transition-colors"
        >
          <span className="text-xl">🧒</span>
          <div className="flex-1">
            <div className="text-sm font-bold text-green-800">招待コードで参加</div>
            <div className="text-xs text-green-600">おうちのひとに もらった 6つの すうじを いれてね</div>
          </div>
          <span className="text-green-300 text-lg">›</span>
        </a>
      )}

      <a
        href="/family/recover"
        className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-200 p-4 hover:bg-gray-100 transition-colors"
      >
        <span className="text-xl">🔑</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-600">リカバリーコードで復元</div>
          <div className="text-xs text-gray-400">親端末をすべて紛失した場合</div>
        </div>
        <span className="text-gray-300 text-lg">›</span>
      </a>
    </div>
  );
}
