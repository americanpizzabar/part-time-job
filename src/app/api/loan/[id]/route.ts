import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/requireParent";
import { LOAN_COMPLETE_CREDIT_BOOST } from "@/lib/optis";
import { getOptisState } from "@/lib/optisServer";

export const dynamic = "force-dynamic";

// APPROVE: 親が承認(monthlyPaymentとinterestPerMonthを最終確定できる)
// REJECT: 親が却下
// REPAY: 子が1ヶ月分返済
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as {
    action: "APPROVE" | "REJECT" | "REPAY";
    monthlyPayment?: number;
    interestPerMonth?: number;
    parentNote?: string;
  };

  // APPROVE/REJECT は親専用。REPAY は子のアクション。
  if (body.action === "APPROVE" || body.action === "REJECT") {
    const deny = await requireParent();
    if (deny) return deny;
  }

  const loan = await prisma.familyLoan.findUnique({ where: { id: Number(id) } });
  if (!loan) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.action === "APPROVE") {
    if (loan.status !== "PENDING") {
      return NextResponse.json({ error: "PENDING状態のローンのみ承認できます" }, { status: 400 });
    }
    const mp = body.monthlyPayment ?? loan.monthlyPayment;
    const ipm = body.interestPerMonth ?? 0;
    const updated = await prisma.familyLoan.update({
      where: { id: Number(id) },
      data: {
        status: "ACTIVE",
        monthlyPayment: mp + ipm,
        interestPerMonth: ipm,
        parentNote: body.parentNote ?? null,
        approvedAt: new Date(),
      },
    });

    // 借入成立 → 子の残高に資金を入金(gcoins換算ではなく実残高として取引記録)
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        amount: loan.principal,
        date: new Date().toISOString().slice(0, 10),
        memo: `ファミリーローン融資: ${loan.purpose}`,
        source: "LOAN",
      },
    });

    return NextResponse.json(updated);
  }

  if (body.action === "REJECT") {
    if (loan.status !== "PENDING") {
      return NextResponse.json({ error: "PENDING状態のローンのみ却下できます" }, { status: 400 });
    }
    const updated = await prisma.familyLoan.update({
      where: { id: Number(id) },
      data: { status: "REJECTED", parentNote: body.parentNote ?? null },
    });
    return NextResponse.json(updated);
  }

  if (body.action === "REPAY") {
    if (loan.status !== "ACTIVE") {
      return NextResponse.json({ error: "返済中のローンのみ操作できます" }, { status: 400 });
    }
    const newPaid = loan.paidMonths + 1;
    const completed = newPaid >= loan.months;

    const updated = await prisma.familyLoan.update({
      where: { id: Number(id) },
      data: {
        paidMonths: newPaid,
        status: completed ? "COMPLETED" : "ACTIVE",
        completedAt: completed ? new Date() : null,
      },
    });

    // 返済支出を取引記録
    await prisma.transaction.create({
      data: {
        type: "EXPENSE",
        amount: loan.monthlyPayment,
        date: new Date().toISOString().slice(0, 10),
        memo: `ローン返済 ${newPaid}/${loan.months}ヶ月目: ${loan.purpose}`,
        needsWants: "NEEDS",
        source: "LOAN",
      },
    });

    // 完済 → 信用スコア大幅UP
    if (completed) {
      const state = await getOptisState();
      await prisma.optisState.update({
        where: { id: state.id },
        data: { creditScore: Math.min(100, state.creditScore + LOAN_COMPLETE_CREDIT_BOOST) },
      });
    }

    return NextResponse.json({ ...updated, justCompleted: completed });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
