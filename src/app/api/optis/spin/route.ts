import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";
import { rollRarity, pickReward, RARITY_META } from "@/lib/optis";

export const dynamic = "force-dynamic";

// デイリー・ラッキージャックポット(1日1回)
export async function POST() {
  const state = await getOptisState();
  const todayStr = today();

  if (state.freezeUntil && state.freezeUntil > new Date()) {
    return NextResponse.json({ error: "凍結中はルーレットを回せません" }, { status: 403 });
  }
  if (state.lastSpinDate === todayStr) {
    return NextResponse.json({ error: "本日のルーレットは回し済みです", already: true }, { status: 409 });
  }

  const boosted = state.nmdDate === todayStr; // NMD達成で確変
  const rarity = rollRarity(boosted);
  const unlocked = parseUnlocked(state.unlockedParts);
  const reward = pickReward(rarity, unlocked);

  const data: { lastSpinDate: string; experience?: number; unlockedParts?: string } = {
    lastSpinDate: todayStr,
  };
  if (reward.part) {
    data.unlockedParts = JSON.stringify([...unlocked, reward.part.id]);
  }
  if (reward.exp) {
    data.experience = state.experience + reward.exp;
  }

  const updated = await prisma.optisState.update({ where: { id: state.id }, data });

  await prisma.rewardLog.create({
    data: {
      source: "ROULETTE",
      rarity,
      rewardId: reward.rewardId,
      label: reward.label,
      date: todayStr,
    },
  });

  return NextResponse.json({
    rarity,
    rarityMeta: RARITY_META[rarity],
    boosted,
    reward,
    experience: updated.experience,
  });
}
