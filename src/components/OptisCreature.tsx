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
  awakeningTier?: number; // 0-4: 装備エフェクトの強化度
  onCorePointerDown?: () => void;
  onCorePointerUp?: () => void;
}

// 形態ごとのボディ形状(viewBox 0 0 200 200, 中心 ~100,116)
const BODY_PATHS: Record<OptisForm, string> = {
  // 結晶: 六角形
  LOGICAL: "M100 62 L150 90 L150 142 L100 170 L50 142 L50 90 Z",
  // ブロブ: ぷにぷに
  CREATIVE: "M100 60 C142 60 160 88 158 118 C156 152 132 172 100 172 C68 172 44 152 42 118 C40 88 58 60 100 60 Z",
  // カプセル: 流線型
  HYBRID: "M100 60 C134 60 152 84 152 116 C152 150 132 172 100 172 C68 172 48 150 48 116 C48 84 66 60 100 60 Z",
  // プロフェッショナル: 洗練されたダイヤカット型(やりくりの達人)
  PROFESSIONAL: "M100 58 L138 78 L152 116 L128 162 L100 174 L72 162 L48 116 L62 78 Z",
};

export default function OptisCreature({
  form,
  stage,
  auraId,
  accessoryId,
  animClass,
  frozen,
  size = 200,
  awakeningTier = 0,
  onCorePointerDown,
  onCorePointerUp,
}: OptisCreatureProps) {
  const meta = FORM_META[form];
  const aura = getPart(auraId);
  const auraColor = aura?.color ?? "#94a3b8";
  const accessory = getPart(accessoryId);
  const uid = `${form}-${stage}`;

  const c1 = meta.accent; // ハイライト
  const c2 = meta.color; // ベース
  const particles = stage === 3 ? 4 : stage === 2 ? 2 : 0;
  // 覚醒: Needs(自己投資)で蓄積。装備の発光と知性エフェクトを強化。
  const awk = Math.max(0, Math.min(4, awakeningTier));

  return (
    <div
      className={`relative flex items-center justify-center select-none ${animClass ?? "optis-idle"} ${frozen ? "optis-glitch" : ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id={`aura-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={auraColor} stopOpacity="0.55" />
            <stop offset="55%" stopColor={auraColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={auraColor} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`body-${uid}`} x1="20%" y1="8%" x2="80%" y2="100%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="55%" stopColor={c2} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
          <radialGradient id={`sheen-${uid}`} cx="38%" cy="28%" r="45%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`core-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor={auraColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={auraColor} stopOpacity="0" />
          </radialGradient>
          <filter id={`glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`soft-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* オーラ(発光) — 覚醒で強化 */}
        <g className="aura-g">
          <circle cx="100" cy="108" r="92" fill={`url(#aura-${uid})`} />
          {awk > 0 && <circle cx="100" cy="108" r="96" fill={`url(#aura-${uid})`} opacity={0.18 * awk} />}
        </g>

        {/* 覚醒リング(自己投資による知性エフェクト) */}
        {awk >= 1 && (
          <g className="spin-ccw" filter={`url(#glow-${uid})`} opacity={0.5 + awk * 0.1}>
            <circle
              cx="100" cy="108" r={70 + awk * 4}
              fill="none" stroke={c1} strokeWidth={awk >= 3 ? 2.5 : 1.6}
              strokeDasharray={`${2 + awk} ${16 - awk}`} strokeLinecap="round"
            />
          </g>
        )}
        {awk >= 3 && (
          <g className="spin-fast" filter={`url(#glow-${uid})`} opacity="0.7">
            {Array.from({ length: awk * 2 }).map((_, i) => {
              const ang = (i / (awk * 2)) * Math.PI * 2;
              return (
                <circle key={i} cx={100 + Math.cos(ang) * 78} cy={108 + Math.sin(ang) * 78} r="2.4" fill={c1} />
              );
            })}
          </g>
        )}

        {/* 回転エネルギーリング(ステージで増加) */}
        {stage >= 2 && (
          <g className="spin-cw" filter={`url(#glow-${uid})`} opacity="0.8">
            <ellipse
              cx="100" cy="108" rx="86" ry="34"
              fill="none" stroke={c1} strokeWidth="2"
              strokeDasharray="2 12" strokeLinecap="round"
            />
          </g>
        )}
        {stage >= 3 && (
          <g className="spin-ccw" filter={`url(#glow-${uid})`} opacity="0.7">
            <ellipse
              cx="100" cy="108" rx="88" ry="60"
              fill="none" stroke={auraColor} strokeWidth="2"
              strokeDasharray="1 14" strokeLinecap="round"
              transform="rotate(24 100 108)"
            />
          </g>
        )}

        {/* 周回パーティクル */}
        {particles > 0 && (
          <g className="spin-fast" filter={`url(#glow-${uid})`}>
            {Array.from({ length: particles }).map((_, i) => {
              const ang = (i / particles) * Math.PI * 2;
              const px = 100 + Math.cos(ang) * 84;
              const py = 108 + Math.sin(ang) * 30;
              return (
                <circle key={i} cx={px} cy={py} r={i % 2 ? 3 : 4.5} fill={i % 2 ? auraColor : c1}>
                  <animate attributeName="opacity" values="0.4;1;0.4" dur={`${1.6 + i * 0.3}s`} repeatCount="indefinite" />
                </circle>
              );
            })}
          </g>
        )}

        {/* 翼(ステージ2以上, ボディ背面) */}
        {stage >= 2 && (
          <g filter={`url(#glow-${uid})`} opacity="0.92">
            <g className="wing-l">
              <path
                d="M82 116 C40 96 22 110 30 132 C40 158 66 150 84 134 Z"
                fill={c2} stroke={c1} strokeWidth="2" opacity="0.85"
              />
            </g>
            <g className="wing-r">
              <path
                d="M118 116 C160 96 178 110 170 132 C160 158 134 150 116 134 Z"
                fill={c2} stroke={c1} strokeWidth="2" opacity="0.85"
              />
            </g>
          </g>
        )}

        {/* ===== 本体 ===== */}
        <g className="breathe-g">
          {/* グロー縁取り */}
          <path d={BODY_PATHS[form]} fill="none" stroke={auraColor} strokeWidth={form === "CREATIVE" ? 6 : 3} filter={`url(#soft-${uid})`} opacity="0.9" />
          {/* ボディ */}
          <path d={BODY_PATHS[form]} fill={`url(#body-${uid})`} stroke={c1} strokeWidth="2.5" />

          {/* 形態ごとの装飾 */}
          {form === "LOGICAL" && (
            <g stroke={c1} strokeWidth="1.2" opacity="0.55" fill="none">
              <path d="M100 62 L100 170 M50 90 L150 142 M150 90 L50 142" />
              <polygon points="100,92 124,108 124,132 100,148 76,132 76,108" opacity="0.4" />
            </g>
          )}
          {form === "CREATIVE" && (
            <g>
              <circle cx="70" cy="150" r="4" fill={c1} opacity="0.6" />
              <circle cx="132" cy="146" r="3" fill={c1} opacity="0.5" />
              <path d="M100 168 q-3 10 0 16 q3 -6 0 -16" fill={c2} stroke={c1} strokeWidth="1.5" />
            </g>
          )}
          {form === "PROFESSIONAL" && (
            <g stroke="#ffffff" strokeWidth="1.4" opacity="0.6" fill="none">
              {/* ダイヤカットのファセット */}
              <path d="M100 58 L72 162 M100 58 L128 162 M62 78 L152 116 M138 78 L48 116" opacity="0.4" />
              <polygon points="100,86 122,116 100,150 78,116" stroke="#ffffff" opacity="0.7" />
              {/* 達人マーク(チェック) */}
              <path d="M90 120 l8 9 l16 -20" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
            </g>
          )}

          {/* つや(ハイライト) */}
          <ellipse cx="84" cy="92" rx="34" ry="24" fill={`url(#sheen-${uid})`} />
          {/* 流れるシーン光 */}
          <rect className="sheen" x="60" y="74" width="14" height="80" rx="7" fill="#ffffff" opacity="0" transform="rotate(18 67 114)" />

          {/* コア(発光・長押し対象) */}
          <g className="core-glow">
            <circle cx="100" cy="122" r="22" fill={`url(#core-${uid})`} />
          </g>

          {/* ===== 顔 ===== */}
          {/* 目(白) + まばたき */}
          {[78, 122].map((ex, idx) => (
            <g key={idx}>
              <ellipse cx={ex} cy="108" rx="13" ry="16" fill="#ffffff">
                {!frozen && (
                  <animate attributeName="ry" values="16;16;2;16;16" keyTimes="0;0.46;0.5;0.54;1" dur="4.5s" repeatCount="indefinite" />
                )}
              </ellipse>
              {frozen ? (
                // 凍結: ぐるぐる目
                <path d={`M${ex - 7} 108 a7 7 0 1 1 7 7`} fill="none" stroke="#0f172a" strokeWidth="2.5" />
              ) : (
                <>
                  <ellipse cx={ex + 1} cy="110" rx="6.5" ry="8" fill="#0f172a">
                    <animate attributeName="ry" values="8;8;1;8;8" keyTimes="0;0.46;0.5;0.54;1" dur="4.5s" repeatCount="indefinite" />
                  </ellipse>
                  <circle cx={ex - 2} cy="106" r="2.6" fill="#ffffff" />
                  <circle cx={ex + 4} cy="113" r="1.4" fill="#ffffff" opacity="0.8" />
                </>
              )}
            </g>
          ))}

          {/* ほっぺ */}
          {!frozen && (
            <>
              <ellipse cx="64" cy="124" rx="7" ry="4.5" fill={form === "CREATIVE" ? "#fb7185" : c1} opacity="0.45" />
              <ellipse cx="136" cy="124" rx="7" ry="4.5" fill={form === "CREATIVE" ? "#fb7185" : c1} opacity="0.45" />
            </>
          )}

          {/* 口 */}
          {frozen ? (
            <path d="M86 138 L114 138" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          ) : form === "LOGICAL" ? (
            <path d="M88 134 L100 140 L112 134" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M86 134 Q100 148 114 134" fill="none" stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round" />
          )}

          {/* 透明ヒットエリア(コア長押し) */}
          <circle
            cx="100" cy="122" r="26" fill="transparent"
            style={{ cursor: "pointer" }}
            onPointerDown={onCorePointerDown}
            onPointerUp={onCorePointerUp}
            onPointerLeave={onCorePointerUp}
          />
        </g>

        {/* 触角(ステージ1の素朴さ→上に光点) */}
        <g filter={`url(#glow-${uid})`}>
          <line x1="100" y1="62" x2="100" y2="44" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="42" r="5" fill={auraColor} className="twinkle" />
        </g>

        {/* 光輪(最終形態) */}
        {stage >= 3 && (
          <g className="halo-g" filter={`url(#glow-${uid})`}>
            <ellipse cx="100" cy="56" rx="34" ry="11" fill="none" stroke="#fde047" strokeWidth="4" opacity="0.9" />
          </g>
        )}
      </svg>

      {/* アクセサリー(頭上) */}
      {accessory?.emoji && (
        <div
          className="absolute left-1/2 -translate-x-1/2 leading-none"
          style={{ top: size * 0.13, fontSize: size * 0.17 }}
        >
          {accessory.emoji}
        </div>
      )}
    </div>
  );
}
