"use client";

import { OptisForm, FORM_META, getPart } from "@/lib/optis";

interface OptisCreatureProps {
  form: OptisForm;
  stage: 1 | 2 | 3;
  auraId: string;
  accessoryId?: string | null;
  animClass?: string;
  frozen?: boolean;
  size?: number;
  onCorePointerDown?: () => void;
  onCorePointerUp?: () => void;
}

export default function OptisCreature({
  form,
  stage,
  auraId,
  accessoryId,
  animClass,
  frozen,
  size = 200,
  onCorePointerDown,
  onCorePointerUp,
}: OptisCreatureProps) {
  const meta = FORM_META[form];
  const aura = getPart(auraId);
  const auraColor = aura?.color ?? "#94a3b8";
  const accessory = getPart(accessoryId);

  // ステージで装飾を増やす
  const orbits = stage >= 2 ? (stage === 3 ? 3 : 2) : 0;

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* オーラ(発光リング) */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.95,
          height: size * 0.95,
          background: `radial-gradient(circle, ${auraColor}55 0%, ${auraColor}00 70%)`,
          filter: "blur(4px)",
        }}
      />

      {/* 周回パーティクル */}
      {Array.from({ length: orbits }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full optis-spin"
          style={{
            width: size,
            height: size,
            animationDuration: `${6 + i * 2}s`,
            animationIterationCount: "infinite",
            animationTimingFunction: "linear",
          }}
        >
          <span
            className="absolute rounded-full"
            style={{
              top: 0,
              left: "50%",
              width: 12,
              height: 12,
              marginLeft: -6,
              background: meta.accent,
              boxShadow: `0 0 10px ${meta.accent}`,
            }}
          />
        </div>
      ))}

      {/* 本体 */}
      <div className={`relative ${animClass ?? "optis-idle"} ${frozen ? "optis-glitch" : ""}`}>
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 120 120">
          <defs>
            <radialGradient id={`body-${form}`} cx="40%" cy="35%" r="75%">
              <stop offset="0%" stopColor={meta.accent} />
              <stop offset="100%" stopColor={meta.color} />
            </radialGradient>
          </defs>

          {/* ボディ形状: 形態で変化 */}
          {form === "LOGICAL" ? (
            // 結晶化(角張った六角形)
            <polygon
              points="60,8 104,32 104,88 60,112 16,88 16,32"
              fill={`url(#body-${form})`}
              stroke={meta.accent}
              strokeWidth="2"
            />
          ) : form === "CREATIVE" ? (
            // 丸みのあるブロブ
            <path
              d="M60 10 C92 10 110 34 108 64 C106 96 84 112 60 112 C36 112 14 96 12 64 C10 34 28 10 60 10 Z"
              fill={`url(#body-${form})`}
              stroke={meta.accent}
              strokeWidth="2"
            />
          ) : (
            // 流線型カプセル
            <rect
              x="18"
              y="14"
              width="84"
              height="92"
              rx="42"
              fill={`url(#body-${form})`}
              stroke={meta.accent}
              strokeWidth="2"
            />
          )}

          {/* 目 */}
          <circle cx="44" cy="54" r="8" fill="#fff" />
          <circle cx="76" cy="54" r="8" fill="#fff" />
          <circle cx={frozen ? 46 : 45} cy="56" r="4" fill="#0f172a" />
          <circle cx={frozen ? 78 : 77} cy="56" r="4" fill="#0f172a" />

          {/* 口 */}
          {frozen ? (
            <path d="M46 78 L74 78" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          ) : (
            <path d="M46 76 Q60 88 74 76" stroke="#0f172a" strokeWidth="3" fill="none" strokeLinecap="round" />
          )}

          {/* コア(中心の光・長押し対象) */}
          <circle
            cx="60"
            cy="60"
            r="11"
            fill={auraColor}
            opacity="0.0"
            style={{ cursor: "pointer" }}
            onPointerDown={onCorePointerDown}
            onPointerUp={onCorePointerUp}
            onPointerLeave={onCorePointerUp}
          />
        </svg>

        {/* アクセサリー(頭上) */}
        {accessory?.emoji && (
          <div
            className="absolute left-1/2 -translate-x-1/2 text-2xl"
            style={{ top: -size * 0.06 }}
          >
            {accessory.emoji}
          </div>
        )}
      </div>
    </div>
  );
}
