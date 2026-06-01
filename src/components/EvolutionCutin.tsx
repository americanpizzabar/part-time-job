"use client";

import { useEffect, useState } from "react";
import { OptisForm, FORM_META, STAGE_LABEL } from "@/lib/optis";
import OptisCreature from "@/components/OptisCreature";
import Confetti from "@/components/Confetti";
import { playEvolution, playEvolutionFanfare } from "@/lib/sound";

interface EvolutionCutinProps {
  fromForm: OptisForm;
  fromStage: 1 | 2 | 3;
  toForm: OptisForm;
  toStage: 1 | 2 | 3;
  auraId: string;
  accessoryId?: string | null;
  onClose: () => void;
}

export default function EvolutionCutin({
  fromForm,
  fromStage,
  toForm,
  toStage,
  auraId,
  accessoryId,
  onClose,
}: EvolutionCutinProps) {
  const [phase, setPhase] = useState<"before" | "after">("before");
  const stageUp = toStage > fromStage;
  const meta = FORM_META[toForm];

  useEffect(() => {
    playEvolution();
    const t = setTimeout(() => {
      setPhase("after");
      playEvolutionFanfare();
    }, 850);
    return () => clearTimeout(t);
  }, []);

  const title = stageUp ? "EVOLUTION!" : "TRANSFORM!";
  const sub = stageUp
    ? `${STAGE_LABEL[toStage]} に進化！`
    : `${meta.label} に変身！`;

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: `radial-gradient(circle at 50% 45%, ${meta.color}, #05060a 75%)` }}
    >
      {/* 背景光線 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[160vmax] h-[160vmax] ray-spin"
          style={{ background: `repeating-conic-gradient(from 0deg, ${meta.accent}33 0deg 7deg, transparent 7deg 14deg)`, opacity: 0.5 }}
        />
      </div>

      {/* 白フラッシュ */}
      <div className="absolute inset-0 bg-white cutin-flash pointer-events-none" />

      {/* キャラ */}
      <div className="relative" style={{ height: 260 }}>
        {phase === "before" ? (
          <div className="evo-before-fade">
            <OptisCreature form={fromForm} stage={fromStage} auraId={auraId} accessoryId={accessoryId} size={240} />
          </div>
        ) : (
          <div className="evo-zoom">
            <OptisCreature form={toForm} stage={toStage} auraId={auraId} accessoryId={accessoryId} size={260} />
          </div>
        )}
      </div>

      {phase === "after" && (
        <>
          <Confetti count={70} colors={[meta.color, meta.accent, "#ffffff", "#fde047"]} />
          {/* タイトル */}
          <div className="relative mt-2 text-center px-6">
            <div className="relative inline-block overflow-hidden">
              <h1
                className="title-slide text-4xl font-black tracking-wider text-white"
                style={{ textShadow: `0 0 18px ${meta.accent}, 0 2px 0 ${meta.color}` }}
              >
                {title}
              </h1>
              {/* スラッシュ光 */}
              <div className="absolute inset-0 streak" style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)" }} />
            </div>
            <p className="mt-2 text-lg font-bold" style={{ color: meta.accent }}>{sub}</p>
          </div>

          <button
            onClick={onClose}
            className="relative mt-8 bg-white text-gray-900 font-bold px-10 py-3 rounded-full shadow-xl active:scale-95 transition-transform"
          >
            すごい！
          </button>
        </>
      )}
    </div>
  );
}
