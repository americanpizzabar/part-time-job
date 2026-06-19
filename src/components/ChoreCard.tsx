"use client";

import { useState } from "react";
import { formatJPY } from "@/lib/dateUtils";

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

interface ChoreCardProps {
  chore: ChoreItem;
  date: string;
  onToggle: (chore: ChoreItem) => void;
  onRemoveExtra?: (chore: ChoreItem) => void;
  onEditAmount?: (chore: ChoreItem, newAmount: number | null) => void;
  isParent?: boolean;
  compact?: boolean;
}

export default function ChoreCard({ chore, date, onToggle, onRemoveExtra, onEditAmount, isParent = false, compact = false }: ChoreCardProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const effectiveAmount = chore.amountOverride ?? chore.amount;
  const hasOverride = chore.amountOverride !== null && chore.amountOverride !== undefined;
  const isReduced  = hasOverride && chore.amountOverride! < chore.amount;
  const isIncreased = hasOverride && chore.amountOverride! > chore.amount;

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditValue(String(effectiveAmount));
    setEditing(true);
  }

  function cancelEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(false);
  }

  function confirmEdit(e: React.MouseEvent) {
    e.stopPropagation();
    const v = Number(editValue);
    if (!isNaN(v) && v >= 0) {
      onEditAmount?.(chore, v === chore.amount ? null : v);
    }
    setEditing(false);
  }

  function resetAmount(e: React.MouseEvent) {
    e.stopPropagation();
    onEditAmount?.(chore, null);
    setEditing(false);
  }

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none
        ${chore.completed
          ? isReduced ? "bg-orange-50 border-orange-200" : isIncreased ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-300"
          : "bg-white border-gray-200 hover:border-blue-300"
        }
        ${compact ? "py-2" : ""}
      `}
      onClick={() => !editing && onToggle(chore)}
    >
      <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5
        ${chore.completed ? "border-green-500 bg-green-500" : "border-gray-300"}`}
      >
        {chore.completed && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm ${chore.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
          {chore.name}
          {chore.isExtra && (
            <span className="ml-1.5 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">追加</span>
          )}
        </div>
        {!compact && chore.description && (
          <div className="text-xs text-gray-500 mt-0.5 truncate">{chore.description}</div>
        )}
        {/* 子供向け override インジケーター */}
        {chore.completed && isReduced && (
          <div className="text-xs text-orange-500 mt-0.5">次はきっとできるよ💪</div>
        )}
        {chore.completed && isIncreased && (
          <div className="text-xs text-amber-600 font-semibold mt-0.5">ボーナス！🎁</div>
        )}
      </div>

      {/* 金額エリア */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {editing ? (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              type="number"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              className="w-20 border border-blue-400 rounded px-2 py-0.5 text-sm font-semibold text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
              min="0"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") confirmEdit(e as unknown as React.MouseEvent); if (e.key === "Escape") { setEditing(false); } }}
            />
            <button onClick={confirmEdit} className="text-green-600 hover:text-green-700 p-0.5" title="確定">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 p-0.5" title="キャンセル">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {hasOverride && (
              <button onClick={resetAmount} className="text-xs text-gray-400 hover:text-gray-600 px-1" title="基準額に戻す">
                戻す
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="text-right">
              {isReduced ? (
                <div>
                  <div className="text-xs text-gray-400 line-through">{formatJPY(chore.amount)}</div>
                  <div className="text-sm font-semibold text-orange-500">{formatJPY(effectiveAmount)} ⚠️</div>
                </div>
              ) : isIncreased ? (
                <div className="text-sm font-semibold text-amber-600">{formatJPY(effectiveAmount)} 🎁</div>
              ) : (
                <div className={`text-sm font-semibold ${chore.completed ? "text-green-600" : "text-gray-500"}`}>
                  {formatJPY(effectiveAmount)}
                </div>
              )}
            </div>
            {isParent && onEditAmount && chore.logId !== null && (
              <button
                onClick={startEdit}
                className="text-gray-300 hover:text-blue-500 p-0.5 transition-colors"
                title="金額を編集"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {!editing && chore.isExtra && onRemoveExtra && (
        <button
          className="flex-shrink-0 text-gray-400 hover:text-red-500 p-1"
          onClick={e => { e.stopPropagation(); onRemoveExtra(chore); }}
          title="削除"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
