import { NextResponse } from "next/server";
import { basePrisma, resolveFamilyId, resolveActiveChildId } from "@/lib/prisma";
import { calculateAllowance } from "@/lib/allowanceCalc";

export const dynamic = "force-dynamic";

// 診断用: 稼働ビルドのコミットSHA + 家族内の期間/クイズボーナスを子IDごとに丸ごと表示。
// クイズボーナスが集計に取り込まれない原因(スコープ/日付ずれ)を本番で特定するためのもの。
export async function GET() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_COMMIT_SHA ||
    "unknown";

  let familyId = "?";
  let activeChildId = "?";
  try { familyId = await resolveFamilyId(); } catch (e) { familyId = "ERR:" + (e instanceof Error ? e.message : String(e)); }
  try { activeChildId = await resolveActiveChildId(); } catch (e) { activeChildId = "ERR:" + (e instanceof Error ? e.message : String(e)); }

  // 家族内の全データを子IDごとに(テナントガードを通さない basePrisma で familyId だけ手動スコープ)
  let periods: unknown[] = [];
  let bonuses: unknown[] = [];
  let recompute: unknown = null;
  try {
    const ps = await basePrisma.allowancePeriod.findMany({
      where: { familyId },
      orderBy: { startDate: "desc" },
      take: 8,
    });
    periods = ps.map(p => {
      let hasLine = false;
      try { hasLine = !!JSON.parse(p.snapshot ?? "{}")["quizbonus"]; } catch { hasLine = false; }
      return {
        id: p.id, child: p.childProfileId, start: p.startDate, end: p.endDate,
        isPaid: p.isPaid, chore: p.choreAmount, bonus: p.bonusAmount, total: p.totalAmount,
        snapshotHasQuizLine: hasLine,
      };
    });

    const bs = await basePrisma.quizBonusEarning.findMany({
      where: { familyId },
      orderBy: { earnedDate: "desc" },
      take: 12,
    });
    bonuses = bs.map(b => ({ child: b.childProfileId, date: b.earnedDate, amount: b.amount, settledAt: b.settledAt }));

    // アクティブ子の最新未払い期間を、実際の calculateAllowance(テナント経由)で再計算
    const unpaid = ps.find(p => !p.isPaid && p.childProfileId === activeChildId)
      ?? ps.find(p => !p.isPaid);
    if (unpaid) {
      const calc = await calculateAllowance(unpaid.startDate, unpaid.endDate);
      recompute = {
        forPeriodId: unpaid.id, periodChild: unpaid.childProfileId,
        recomputedChore: calc.choreAmount, recomputedTotal: calc.totalAmount,
        foldedQuizLine: !!calc.choreDetails["quizbonus"],
      };
    }
  } catch (e) {
    recompute = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({ commit: commit.slice(0, 7), familyId, activeChildId, periods, bonuses, recompute });
}
