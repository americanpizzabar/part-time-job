import { prisma } from "@/lib/prisma";
import { toDateStr } from "@/lib/dateUtils";
import { subDays } from "date-fns";
import {
  levelFromExp,
  evolutionStage,
  formFromNeedsRatio,
  isInAfterschoolWindow,
} from "@/lib/optis";

// シングルトンのOptisStateを取得(なければ作成)
export async function getOptisState() {
  const existing = await prisma.optisState.findFirst({ orderBy: { id: "asc" } });
  if (existing) return existing;
  return prisma.optisState.create({ data: {} });
}

export function parseUnlocked(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// 過去14日のNeeds/Wants比率から形態を算出
export async function computeDerived(experience: number) {
  const since = toDateStr(subDays(new Date(), 13));
  const txs = await prisma.transaction.findMany({
    where: { type: "EXPENSE", date: { gte: since } },
  });
  let needs = 0;
  let wants = 0;
  for (const t of txs) {
    if (t.needsWants === "NEEDS") needs += t.amount;
    else if (t.needsWants === "WANTS") wants += t.amount;
  }
  const total = needs + wants;
  const needsRatio = total > 0 ? Math.round((needs / total) * 100) : 50;
  const lv = levelFromExp(experience);
  return {
    ...lv,
    stage: evolutionStage(lv.level),
    form: formFromNeedsRatio(needsRatio),
    needsRatio,
    wantsRatio: 100 - needsRatio,
    needs14: needs,
    wants14: wants,
  };
}

// 後出し不正検知: NMD申告日に放課後ウィンドウの支出が後から追加されていないか
export async function detectNmdFraud(nmdDate: string | null): Promise<boolean> {
  if (!nmdDate) return false;
  const txs = await prisma.transaction.findMany({
    where: { type: "EXPENSE", date: nmdDate },
  });
  return txs.some(t => {
    const when = t.reportedAt ?? t.createdAt;
    return isInAfterschoolWindow(new Date(when));
  });
}
