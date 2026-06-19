"use client";

import { useState } from "react";
import { DAY_NAMES_JA, formatJPY } from "@/lib/dateUtils";
import ChoreCard from "./ChoreCard";
import AddExtraChoreModal from "./AddExtraChoreModal";

interface ChoreItem {
  id: number;
  name: string;
  amount: number;
  amountOverride?: number | null;
  description?: string | null;
  isScheduled: boolean;
  logId: number | null;
  completed: boolean;
  isExtra: boolean;
  completedAt: string | null;
}

interface DayData {
  date: string;
  chores: ChoreItem[];
  totalAmount: number;
}

interface DayViewProps {
  day: DayData;
  isToday: boolean;
  isExpanded?: boolean;
  onRefresh: () => void;
  isParent?: boolean;
}

export default function DayView({ day, isToday, isExpanded = false, onRefresh, isParent = false }: DayViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [collapsed, setCollapsed] = useState(!isExpanded && !isToday);

  const date = new Date(day.date + "T00:00:00");
  const dayOfWeek = DAY_NAMES_JA[date.getDay()];
  const month = date.getMonth() + 1;
  const dayNum = date.getDate();

  const completedCount = day.chores.filter(c => c.completed).length;
  const totalCount = day.chores.length;
  const completedAmount = day.chores.filter(c => c.completed).reduce((s, c) => s + (c.amountOverride ?? c.amount), 0);

  async function handleToggle(chore: ChoreItem) {
    if (chore.logId === null) {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choreId: chore.id, date: day.date, isExtra: chore.isExtra }),
      });
      const log = await res.json();
      await fetch(`/api/logs/${log.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
    } else {
      await fetch(`/api/logs/${chore.logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !chore.completed }),
      });
    }
    onRefresh();
  }

  async function handleAddExtra(choreId: number) {
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choreId, date: day.date, isExtra: true }),
    });
    onRefresh();
  }

  async function handleRemoveExtra(chore: ChoreItem) {
    if (chore.logId) {
      await fetch(`/api/logs/${chore.logId}`, { method: "DELETE" });
      onRefresh();
    }
  }

  async function handleEditAmount(chore: ChoreItem, newAmount: number | null) {
    if (!chore.logId) return;
    await fetch(`/api/logs/${chore.logId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountOverride: newAmount }),
    });
    onRefresh();
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border transition-all
      ${isToday ? "border-blue-400 shadow-blue-100" : "border-gray-200"}
    `}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className={`text-center w-12 ${isToday ? "text-blue-600" : "text-gray-700"}`}>
            <div className="text-xs font-medium">{`${month}/${dayNum}`}</div>
            <div className={`text-lg font-bold ${date.getDay() === 0 ? "text-red-500" : date.getDay() === 6 ? "text-blue-500" : ""}`}>
              {dayOfWeek}
            </div>
          </div>
          {isToday && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">今日</span>
          )}
          {isParent && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">✏️ 修整</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <>
              <div className="flex gap-1">
                {day.chores.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${day.chores[i].completed ? "bg-green-400" : "bg-gray-200"}`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">{completedCount}/{totalCount}</span>
              <span className={`text-sm font-semibold ${completedAmount > 0 ? "text-green-600" : "text-gray-400"}`}>
                {formatJPY(completedAmount)}
              </span>
            </>
          )}
          {totalCount === 0 && <span className="text-sm text-gray-400">お手伝いなし</span>}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {day.chores.map(chore => (
            <ChoreCard
              key={`${chore.id}-${chore.isExtra}`}
              chore={chore}
              date={day.date}
              onToggle={handleToggle}
              onRemoveExtra={chore.isExtra ? handleRemoveExtra : undefined}
              isParent={isParent}
              onEditAmount={isParent && chore.logId !== null ? handleEditAmount : undefined}
            />
          ))}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            お手伝いを追加
          </button>
        </div>
      )}

      {showAddModal && (
        <AddExtraChoreModal
          date={day.date}
          existingChoreIds={day.chores.map(c => c.id)}
          onAdd={handleAddExtra}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
