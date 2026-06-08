import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";
import { today } from "@/lib/dateUtils";
import { rollDailyMissions, MissionType } from "@/lib/dailyMissions";

export const dynamic = "force-dynamic";

async function isMissionCompleted(
  type: MissionType,
  state: Awaited<ReturnType<typeof getOptisState>>,
  todayStr: string
): Promise<boolean> {
  const startOfDay = new Date(todayStr + "T00:00:00.000Z");
  switch (type) {
    case "MARKET_BUY":
      return (await prisma.marketTrade.count({ where: { action: "BUY", date: todayStr } })) > 0;
    case "MARKET_SELL":
      return (await prisma.marketTrade.count({ where: { action: "SELL", date: todayStr } })) > 0;
    case "NMD":
      return state.nmdDate === todayStr;
    case "BANK_DEPOSIT":
      return (await prisma.virtualBankDeposit.count({ where: { depositDate: todayStr } })) > 0;
    case "QUIZ_CORRECT":
      return (
        (await prisma.quizAttempt.count({ where: { correct: true, createdAt: { gte: startOfDay } } })) > 0
      );
    case "SAVINGS_CONTRIBUTE":
      return (
        (await prisma.savingsTransaction.count({ where: { date: todayStr, amount: { gt: 0 } } })) > 0
      );
    case "DECODE_SOLVE":
      return (await prisma.decodeMission.count({ where: { solvedAt: { gte: startOfDay } } })) > 0;
    case "FORECAST_BUY":
      return (
        (await prisma.feedItem.count({ where: { category: "FORECAST", createdAt: { gte: startOfDay } } })) > 0
      );
    case "WORD_SOLVE":
      return (await prisma.wordMission.count({ where: { solvedAt: { gte: startOfDay } } })) > 0;
    default:
      return false;
  }
}

async function isClaimed(type: MissionType, dateStr: string): Promise<boolean> {
  return (
    (await prisma.feedItem.count({
      where: { category: "DAILY_MISSION", title: `dm:${type}:${dateStr}` },
    })) > 0
  );
}

export async function GET() {
  const state = await getOptisState();
  const todayStr = today();
  const defs = rollDailyMissions(todayStr);

  const missions = await Promise.all(
    defs.map(async (m) => {
      const [completed, claimed] = await Promise.all([
        isMissionCompleted(m.type, state, todayStr),
        isClaimed(m.type, todayStr),
      ]);
      return { ...m, completed, claimed };
    })
  );

  return NextResponse.json({ missions, todayStr });
}

export async function POST(req: Request) {
  const { type } = (await req.json()) as { type: MissionType };
  const state = await getOptisState();
  const todayStr = today();

  const defs = rollDailyMissions(todayStr);
  const def = defs.find((m) => m.type === type);
  if (!def) return NextResponse.json({ error: "今日のミッションではありません" }, { status: 400 });

  if (await isClaimed(type, todayStr)) {
    return NextResponse.json({ error: "すでに報酬受取済みです" }, { status: 400 });
  }

  const completed = await isMissionCompleted(type, state, todayStr);
  if (!completed) {
    return NextResponse.json({ error: "ミッションが未達成です" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.feedItem.create({
      data: {
        title: `dm:${type}:${todayStr}`,
        body: def.title,
        category: "DAILY_MISSION",
        isActive: false,
      },
    }),
    prisma.optisState.update({
      where: { id: state.id },
      data: {
        experience: state.experience + def.reward.exp,
        gcoins: state.gcoins + def.reward.gcoins,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, reward: def.reward });
}
