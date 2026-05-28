"use client";

import { formatJPY } from "@/lib/dateUtils";

interface NeedsWantsPieProps {
  needs: number;
  wants: number;
  needsRatio: number;
  wantsRatio: number;
}

const NEEDS_COLOR = "#3b82f6"; // blue
const WANTS_COLOR = "#f97316"; // orange

export default function NeedsWantsPie({ needs, wants, needsRatio, wantsRatio }: NeedsWantsPieProps) {
  const total = needs + wants;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        この期間の支出データがありません
      </div>
    );
  }

  const gradient = `conic-gradient(${NEEDS_COLOR} 0% ${needsRatio}%, ${WANTS_COLOR} ${needsRatio}% 100%)`;

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <div
          className="w-32 h-32 rounded-full"
          style={{ background: gradient }}
        />
        <div className="absolute inset-0 m-auto w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center">
          <div className="text-xs text-gray-400">合計</div>
          <div className="text-sm font-bold text-gray-700">{formatJPY(total)}</div>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: NEEDS_COLOR }} />
            <span className="text-sm font-medium text-gray-700">必要 (Needs)</span>
            <span className="ml-auto text-sm font-bold" style={{ color: NEEDS_COLOR }}>
              {needsRatio}%
            </span>
          </div>
          <div className="text-xs text-gray-500 pl-5">{formatJPY(needs)}</div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: WANTS_COLOR }} />
            <span className="text-sm font-medium text-gray-700">欲しい (Wants)</span>
            <span className="ml-auto text-sm font-bold" style={{ color: WANTS_COLOR }}>
              {wantsRatio}%
            </span>
          </div>
          <div className="text-xs text-gray-500 pl-5">{formatJPY(wants)}</div>
        </div>
      </div>
    </div>
  );
}
