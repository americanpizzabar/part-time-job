"use client";

import { formatJPY } from "@/lib/dateUtils";

interface ChoreItem {
  id: number;
  name: string;
  amount: number;
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
  compact?: boolean;
}

export default function ChoreCard({ chore, date, onToggle, onRemoveExtra, compact = false }: ChoreCardProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none
        ${chore.completed
          ? "bg-green-50 border-green-300"
          : "bg-white border-gray-200 hover:border-blue-300"
        }
        ${compact ? "py-2" : ""}
      `}
      onClick={() => onToggle(chore)}
    >
      <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
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
      </div>

      <div className={`flex-shrink-0 text-sm font-semibold ${chore.completed ? "text-green-600" : "text-gray-500"}`}>
        {formatJPY(chore.amount)}
      </div>

      {chore.isExtra && onRemoveExtra && (
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
