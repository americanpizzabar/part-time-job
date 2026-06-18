import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/requireParent";
import { today } from "@/lib/dateUtils";
import { calculateAllowance } from "@/lib/allowanceCalc";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const periodId = Number(id);
  const body = await req.json();
  const { isPaid, notes, recalculate, bonusAmount, bonusMemo } = body;

  // ボーナス追加・変更（親のみ・未払いのみ）
  if (bonusAmount !== undefined) {
    const deny = await requireParent();
    if (deny) return deny;
    const existing = await prisma.allowancePeriod.findUnique({ where: { id: periodId } });
    if (!existing || existing.isPaid) {
      return NextResponse.json({ error: "支払済みの期間にはボーナスを変更できません" }, { status: 400 });
    }
    const newTotal = existing.baseAmount + existing.choreAmount + Number(bonusAmount);
    const updated = await prisma.allowancePeriod.update({
      where: { id: periodId },
      data: { bonusAmount: Number(bonusAmount), bonusMemo: bonusMemo ?? null, totalAmount: newTotal },
    });
    return NextResponse.json(updated);
  }

  // 支払い済み操作は親のみ(収入トランザクションを自動計上するため)
  if (isPaid !== undefined) {
    const deny = await requireParent();
    if (deny) return deny;
  }

  // 再集計: 未払い期間を現在の完了ログで再計算する(bonusAmountは保持)
  if (recalculate) {
    const existing = await prisma.allowancePeriod.findUnique({ where: { id: periodId } });
    if (!existing || existing.isPaid) {
      return NextResponse.json({ error: "支払済みの期間は再集計できません" }, { status: 400 });
    }
    const { baseAmount, choreAmount, choreDetails } = await calculateAllowance(
      existing.startDate,
      existing.endDate
    );
    const bonus = existing.bonusAmount ?? 0;
    const updated = await prisma.allowancePeriod.update({
      where: { id: periodId },
      data: { baseAmount, choreAmount, totalAmount: baseAmount + choreAmount + bonus, snapshot: JSON.stringify(choreDetails) },
    });
    return NextResponse.json(updated);
  }

  const period = await prisma.allowancePeriod.update({
    where: { id: periodId },
    data: {
      ...(isPaid !== undefined && { isPaid, paidAt: isPaid ? new Date() : null }),
      ...(notes !== undefined && { notes }),
    },
  });

  // 支払済 → お小遣いを収入として自動計上 / 取消 → 削除
  if (isPaid !== undefined) {
    const linked = await prisma.transaction.findUnique({
      where: { allowancePeriodId: periodId },
    });
    if (isPaid && !linked) {
      await prisma.transaction.create({
        data: {
          type: "INCOME",
          amount: period.totalAmount,
          date: today(),
          memo: `お小遣い受取 (${period.startDate}〜${period.endDate})`,
          source: "ALLOWANCE",
          allowancePeriodId: periodId,
        },
      });
    } else if (!isPaid && linked) {
      await prisma.transaction.delete({ where: { id: linked.id } });
    }
  }

  return NextResponse.json(period);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireParent();
  if (deny) return deny;

  const { id } = await params;
  const periodId = Number(id);
  const linked = await prisma.transaction.findUnique({
    where: { allowancePeriodId: periodId },
  });
  if (linked) {
    await prisma.transaction.delete({ where: { id: linked.id } });
  }
  await prisma.allowancePeriod.delete({ where: { id: periodId } });
  return NextResponse.json({ ok: true });
}
