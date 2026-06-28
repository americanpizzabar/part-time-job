import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/requireParent";
import { calculateAllowance } from "@/lib/allowanceCalc";
import { currentWeekRange } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

// 未精算のデイリー報酬クイズ・ボーナスの集計を返す(親レポート / 子のプール残高表示)
export async function GET() {
  const pending = await prisma.quizBonusEarning.findMany({
    where: { settledAt: null },
    orderBy: { earnedDate: "asc" },
  });
  const total = pending.reduce((s, e) => s + e.amount, 0);
  const hardPodCount = pending.filter(e => e.isHardPod).length;
  return NextResponse.json({
    pendingTotal: total,
    correctCount: pending.length,
    hardPodCount,
    firstDate: pending[0]?.earnedDate ?? null,
    lastDate: pending[pending.length - 1]?.earnedDate ?? null,
    items: pending,
  });
}

// 週末精算: 親が「お小遣いに上乗せ(settle)」または「手渡し済み(handoff)」を確定する。
export async function POST(req: Request) {
  const deny = await requireParent();
  if (deny) return deny;

  const body = await req.json();
  const { action, periodId } = body as { action: "settle" | "handoff"; periodId?: number };

  const pending = await prisma.quizBonusEarning.findMany({ where: { settledAt: null } });
  if (pending.length === 0) {
    return NextResponse.json({ error: "精算できるボーナスがありません" }, { status: 400 });
  }
  const total = pending.reduce((s, e) => s + e.amount, 0);
  const now = new Date();

  if (action === "handoff") {
    // 手渡し/電子マネー送金済みとして記録のみ(お小遣いには上乗せしない)
    await prisma.quizBonusEarning.updateMany({
      where: { settledAt: null },
      data: { settledAt: now },
    });
    return NextResponse.json({ ok: true, settledTotal: total, mode: "handoff" });
  }

  // settle: 未払いの AllowancePeriod の bonusAmount へ上乗せ
  let period = periodId
    ? await prisma.allowancePeriod.findUnique({ where: { id: periodId } })
    : await prisma.allowancePeriod.findFirst({ where: { isPaid: false }, orderBy: { startDate: "desc" } });

  // 上乗せ先の未払い期間が無ければ、今週分の期間を自動作成してそこへ上乗せする。
  // (まだ「集計する」を押していなくてもクイズ報酬を渡せるようにする)
  if (!period && !periodId) {
    const config = await prisma.aggregationConfig.findFirst();
    const { start, end } = currentWeekRange(config?.startDayOfWeek ?? 1);
    const calc = await calculateAllowance(start, end);
    period = await prisma.allowancePeriod.create({
      data: {
        startDate: start,
        endDate: end,
        baseAmount: calc.baseAmount,
        choreAmount: calc.choreAmount,
        totalAmount: calc.totalAmount,
        snapshot: JSON.stringify(calc.choreDetails),
      },
    });
  }

  if (!period || period.isPaid) {
    return NextResponse.json({ error: "上乗せ先の未払いお小遣い期間がありません" }, { status: 400 });
  }

  const newBonus = (period.bonusAmount ?? 0) + total;
  const memo = `クイズ報酬 +¥${total}（${pending.length}問正解）`;
  const updated = await prisma.allowancePeriod.update({
    where: { id: period.id },
    data: {
      bonusAmount: newBonus,
      bonusMemo: period.bonusMemo ? `${period.bonusMemo} / ${memo}` : memo,
      totalAmount: period.baseAmount + period.choreAmount + newBonus,
    },
  });
  await prisma.quizBonusEarning.updateMany({
    where: { settledAt: null },
    data: { settledAt: now, settledPeriodId: period.id },
  });

  return NextResponse.json({ ok: true, settledTotal: total, mode: "settle", period: updated });
}
