import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateStr } from "@/lib/dateUtils";
import { subDays, addDays, getDay } from "date-fns";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";
import { PARTS, getPart } from "@/lib/optis";

export const dynamic = "force-dynamic";

// 週(月〜土)の集計範囲を返す。startDayOfWeekを週開始とみなす
async function weekWindow() {
  const agg = await prisma.aggregationConfig.findFirst({ orderBy: { id: "asc" } });
  const startDay = agg?.startDayOfWeek ?? 1;
  const now = new Date();
  const diff = (getDay(now) - startDay + 7) % 7;
  const weekStart = subDays(now, diff);
  const sixthDay = addDays(weekStart, 5); // 月開始なら土曜
  return {
    weekStartStr: toDateStr(weekStart),
    spendStart: toDateStr(weekStart),
    spendEnd: toDateStr(sixthDay),
    weeklyBudget: agg?.weeklyBudget ?? null,
  };
}

export async function GET() {
  const state = await getOptisState();
  const { weekStartStr, spendStart, spendEnd, weeklyBudget } = await weekWindow();
  const txs = await prisma.transaction.findMany({
    where: { type: "EXPENSE", date: { gte: spendStart, lte: spendEnd } },
  });
  const spent = txs.reduce((s, t) => s + t.amount, 0);
  const claimed = state.lastChestWeek === weekStartStr;
  const eligible = weeklyBudget != null && spent <= weeklyBudget;

  return NextResponse.json({
    weekStart: weekStartStr,
    weeklyBudget,
    spent,
    eligible,
    claimed,
    canClaim: eligible && !claimed,
  });
}

export async function POST() {
  const state = await getOptisState();
  const { weekStartStr, spendStart, spendEnd, weeklyBudget } = await weekWindow();
  if (weeklyBudget == null) {
    return NextResponse.json({ error: "週予算が未設定です" }, { status: 400 });
  }
  if (state.lastChestWeek === weekStartStr) {
    return NextResponse.json({ error: "今週は受け取り済みです" }, { status: 409 });
  }
  const txs = await prisma.transaction.findMany({
    where: { type: "EXPENSE", date: { gte: spendStart, lte: spendEnd } },
  });
  const spent = txs.reduce((s, t) => s + t.amount, 0);
  if (spent > weeklyBudget) {
    return NextResponse.json({ error: "週予算を超えています", spent }, { status: 400 });
  }

  // 未所持のレア・パーツを確定ドロップ
  const unlocked = parseUnlocked(state.unlockedParts);
  let pool = PARTS.filter(p => p.rarity === "RARE" && !unlocked.includes(p.id));
  if (pool.length === 0) {
    pool = PARTS.filter(
      p => (p.rarity === "UNCOMMON" || p.rarity === "LEGENDARY") && !unlocked.includes(p.id)
    );
  }
  if (pool.length === 0) {
    // 全所持済み → 経験値報酬
    const updated = await prisma.optisState.update({
      where: { id: state.id },
      data: { lastChestWeek: weekStartStr, experience: state.experience + 150 },
    });
    await prisma.rewardLog.create({
      data: { source: "CHEST", rarity: "RARE", rewardId: "exp:150", label: "経験値 +150 EXP", date: weekStartStr },
    });
    return NextResponse.json({ reward: { label: "経験値 +150 EXP", exp: 150 }, experience: updated.experience });
  }

  const part = pool[Math.floor(Math.random() * pool.length)];
  await prisma.optisState.update({
    where: { id: state.id },
    data: { lastChestWeek: weekStartStr, unlockedParts: JSON.stringify([...unlocked, part.id]) },
  });
  await prisma.rewardLog.create({
    data: { source: "CHEST", rarity: part.rarity, rewardId: part.id, label: `${part.emoji ?? "✨"} ${part.name}`, date: weekStartStr },
  });
  return NextResponse.json({ reward: { label: `${part.emoji ?? "✨"} ${part.name}`, part: getPart(part.id) } });
}
