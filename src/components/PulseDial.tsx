"use client";

import { useRef } from "react";
import { playTick } from "@/lib/sound";
import { hapticTick } from "@/lib/haptics";

interface PulseDialProps {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}

// 「パルス・ダイアル」: 光の円を指でなぞって金額を増減するサイバーUI。
// 時計回りで増、反時計回りで減。一定角度ごとに金庫ダイヤルのような tick(音+振動)。
// ステップ額は金額帯で動的に変化(少額は細かく、高額はざっくり)。
function stepFor(v: number): number {
  if (v < 1000) return 10;
  if (v < 5000) return 50;
  return 100;
}

// 1ステップ進めるのに必要な角度(度)。小さいほど敏感。
const DEG_PER_STEP = 12;

export default function PulseDial({ value, onChange, max = 9999999 }: PulseDialProps) {
  const dragging = useRef(false);
  const lastAngle = useRef(0);
  const accum = useRef(0); // 未消化の角度(度)
  const tickCount = useRef(0);
  const ringRef = useRef<SVGSVGElement>(null);

  function angleAt(clientX: number, clientY: number): number {
    const rect = ringRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  }

  function onDown(e: React.PointerEvent) {
    dragging.current = true;
    lastAngle.current = angleAt(e.clientX, e.clientY);
    accum.current = 0;
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const a = angleAt(e.clientX, e.clientY);
    let delta = a - lastAngle.current;
    // -180..180 に正規化(リング境界をまたぐ場合の補正)
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngle.current = a;
    accum.current += delta;

    let next = value;
    while (accum.current >= DEG_PER_STEP) {
      accum.current -= DEG_PER_STEP;
      next = Math.min(max, next + stepFor(next));
    }
    while (accum.current <= -DEG_PER_STEP) {
      accum.current += DEG_PER_STEP;
      next = Math.max(0, next - stepFor(Math.max(0, next - 1)));
    }
    if (next !== value) {
      onChange(next);
      tickCount.current += 1;
      playTick(tickCount.current);
      hapticTick();
    }
  }

  function onUp() {
    dragging.current = false;
    accum.current = 0;
  }

  // 金額に応じてリングの進捗(0..1)を見せる。1万円で一周する目安。
  const progress = Math.min(1, (value % 10000) / 10000);
  const R = 86;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center select-none">
      <svg
        ref={ringRef}
        viewBox="0 0 220 220"
        className="w-56 h-56 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <defs>
          <linearGradient id="dial-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        {/* 外周のサイバーな目盛り */}
        {Array.from({ length: 36 }).map((_, i) => {
          const ang = (i / 36) * Math.PI * 2 - Math.PI / 2;
          const r1 = 100, r2 = i % 3 === 0 ? 90 : 95;
          return (
            <line
              key={i}
              x1={110 + Math.cos(ang) * r1}
              y1={110 + Math.sin(ang) * r1}
              x2={110 + Math.cos(ang) * r2}
              y2={110 + Math.sin(ang) * r2}
              stroke="#cbd5e1"
              strokeWidth={i % 3 === 0 ? 2 : 1}
            />
          );
        })}
        {/* ベースリング */}
        <circle cx="110" cy="110" r={R} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        {/* 進捗リング */}
        <circle
          cx="110"
          cy="110"
          r={R}
          fill="none"
          stroke="url(#dial-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          transform="rotate(-90 110 110)"
          style={{ transition: "stroke-dashoffset 0.08s linear" }}
        />
        {/* 中央の金額 */}
        <text x="110" y="104" textAnchor="middle" className="fill-gray-800" style={{ fontSize: 30, fontWeight: 800 }}>
          ¥{value.toLocaleString()}
        </text>
        <text x="110" y="130" textAnchor="middle" className="fill-gray-400" style={{ fontSize: 12 }}>
          なぞって調整 🌀
        </text>
      </svg>
    </div>
  );
}
