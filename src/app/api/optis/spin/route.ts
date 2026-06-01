import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";
import { getOptisState, parseUnlocked, isRouletteBoostEligible } from "@/lib/optisServer";
import { rollRarity, pickReward, RARITY_META, GCOIN_REWARDS } from "@/lib/optis";

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

  // 確変: 計画通りの支出 or Needs(自己投資)記録で確率2倍(NMDは補助的扱い)
  const boosted = (await isRouletteBoostEligible(todayStr)) || state.nmdDate === todayStr;
  const rarity = rollRarity(boosted);
  const unlocked = parseUnlocked(state.unlockedParts);
  const reward = pickReward(rarity, unlocked);

  const gcoinBonus = GCOIN_REWARDS[rarity];
  const data: { lastSpinDate: string; experience?: number; unlockedParts?: string; gcoins: number } = {
    lastSpinDate: todayStr,
    gcoins: state.gcoins + gcoinBonus,
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
    gcoinBonus,
    gcoins: updated.gcoins,
  });
}
