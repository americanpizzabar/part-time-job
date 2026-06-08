import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";
import { pickReward } from "@/lib/optis";

export const dynamic = "force-dynamic";

// 深夜23:00台だけ開く「シークレット・ドロップ」(ゲリラ・ウィンドウ)。
// 1日1回だけ回収可能。回収記録は RewardLog(source="DROP")で管理する。
const DROP_HOUR = 23;

function isWindowOpen(d: Date = new Date()): boolean {
  return d.getHours() === DROP_HOUR;
}

async function claimedToday(): Promise<boolean> {
  const existing = await prisma.rewardLog.findFirst({
    where: { source: "DROP", date: today() },
  });
  return !!existing;
}

export async function GET() {
  const open = isWindowOpen();
  const claimed = await claimedToday();
  return NextResponse.json({
    windowOpen: open,
    claimedToday: claimed,
    dropHour: DROP_HOUR,
    serverHour: new Date().getHours(),
  });
}

export async function POST() {
  if (!isWindowOpen()) {
    return NextResponse.json({ error: "ドロップ・ウィンドウは閉じている" }, { status: 400 });
  }
  if (await claimedToday()) {
    return NextResponse.json({ error: "本日は回収済み" }, { status: 400 });
  }

  const state = await getOptisState();
  const unlocked = parseUnlocked(state.unlockedParts);

  // 報酬: 固定の EXP + G-COIN。さらにレア抽選でパーツ or EXP ボーナス。
  const expGained = 80;
  const gcoinGained = 30;
  const roll = pickReward("RARE", unlocked);

  let unlockedPart: { id: string; name: string; emoji?: string } | null = null;
  let bonusExp = 0;
  let newUnlocked = unlocked;
  if (roll.part) {
    newUnlocked = [...unlocked, roll.part.id];
    unlockedPart = { id: roll.part.id, name: roll.part.name, emoji: roll.part.emoji };
  } else if (roll.exp) {
    bonusExp = roll.exp;
  }

  await prisma.optisState.update({
    where: { id: state.id },
    data: {
      experience: state.experience + expGained + bonusExp,
      gcoins: state.gcoins + gcoinGained,
      ...(newUnlocked !== unlocked ? { unlockedParts: JSON.stringify(newUnlocked) } : {}),
    },
  });

  await prisma.rewardLog.create({
    data: {
      source: "DROP",
      rarity: roll.part ? roll.part.rarity : "RARE",
      rewardId: roll.rewardId,
      label: roll.label,
      date: today(),
    },
  });

  return NextResponse.json({
    ok: true,
    expGained: expGained + bonusExp,
    gcoinGained,
    unlockedPart,
    label: roll.label,
  });
}
