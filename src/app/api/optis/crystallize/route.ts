import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState, computeDerived } from "@/lib/optisServer";
import { CRYSTALLIZE_MIN_LEVEL, CRYSTALLIZE_MIN_STAGE } from "@/lib/optis";

export const dynamic = "force-dynamic";

// 転生(結晶化): 最終形態Lv.15以上で実行可能
// Optisを初期化しメモリーキューブを生成。generation++。
export async function POST() {
  const state = await getOptisState();
  const derived = await computeDerived(state.experience, state.awakening, state.generation);

  if (derived.stage < CRYSTALLIZE_MIN_STAGE) {
    return NextResponse.json({ error: `転生には最終形態（ステージ${CRYSTALLIZE_MIN_STAGE}）が必要です` }, { status: 400 });
  }
  if (derived.level < CRYSTALLIZE_MIN_LEVEL) {
    return NextResponse.json({ error: `転生にはLv.${CRYSTALLIZE_MIN_LEVEL}以上が必要です（現在Lv.${derived.level}）` }, { status: 400 });
  }

  const cube = await prisma.memoryCube.create({
    data: {
      generation: state.generation,
      form: derived.form,
      stage: derived.stage,
      level: derived.level,
      awakening: state.awakening,
      creditScore: state.creditScore,
    },
  });

  // Optisをリセット(EXP・覚醒をゼロに、世代+1)
  const updated = await prisma.optisState.update({
    where: { id: state.id },
    data: {
      experience: 0,
      awakening: 0,
      generation: state.generation + 1,
    },
  });

  return NextResponse.json({ ok: true, cube, newGeneration: updated.generation });
}
