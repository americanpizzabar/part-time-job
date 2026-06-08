import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";
import { calculateAllowance } from "@/lib/allowanceCalc";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const periodId = Number(id);
  const body = await req.json();
  const { isPaid, notes, recalculate } = body;

  // 再集計: 未払い期間を現在の完了ログで再計算する
  if (recalculate) {
    const existing = await prisma.allowancePeriod.findUnique({ where: { id: periodId } });
    if (!existing || existing.isPaid) {
      return NextResponse.json({ error: "支払済みの期間は再集計できません" }, { status: 400 });
    }
    const { baseAmount, choreAmount, totalAmount, choreDetails } = await calculateAllowance(
      existing.startDate,
      existing.endDate
    );
    const updated = await prisma.allowancePeriod.update({
      where: { id: periodId },
      data: { baseAmount, choreAmount, totalAmount, snapshot: JSON.stringify(choreDetails) },
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
