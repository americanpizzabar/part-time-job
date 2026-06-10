import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { basePrisma, MEMBER_COOKIE } from "@/lib/prisma";
import { currentWeekRange } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

// きょうだい対抗・シンクロバトル(非公開ランキング)。
// お小遣い額や購入内容は一切返さない。返すのは「率(%)」だけ:
//  - quizAccuracy: 今週のクイズ正答率(シンクロ率)
//  - budgetAchievement: 今週の週予算の達成率(家族共通の週予算に対して)
//  - syncScore: 上記の平均(総合知性スコア)
// プライバシー保護のため、金額そのものは絶対に含めない。
export async function GET() {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "未認証" }, { status: 401 });
  const member = await basePrisma.familyMember.findUnique({ where: { token } });
  if (!member) return NextResponse.json({ error: "メンバーが見つかりません" }, { status: 401 });

  const familyId = member.familyId;
  const children = await basePrisma.childProfile.findMany({
    where: { familyId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, avatar: true, color: true },
  });

  const agg = await basePrisma.aggregationConfig.findFirst({ where: { familyId } });
  const weeklyBudget = agg?.weeklyBudget ?? null;
  const { start, end } = currentWeekRange(agg?.startDayOfWeek ?? 1);
  const weekStart = new Date(start + "T00:00:00");

  const rows = await Promise.all(children.map(async (c) => {
    // クイズ正答率(今週)
    const [total, correct] = await Promise.all([
      basePrisma.quizAttempt.count({
        where: { familyId, childProfileId: c.id, createdAt: { gte: weekStart } },
      }),
      basePrisma.quizAttempt.count({
        where: { familyId, childProfileId: c.id, correct: true, createdAt: { gte: weekStart } },
      }),
    ]);
    const quizAccuracy = total > 0 ? Math.round((correct / total) * 100) : null;

    // 週予算の達成率(今週の支出 vs 家族共通の週予算)
    let budgetAchievement: number | null = null;
    if (weeklyBudget && weeklyBudget > 0) {
      const spentAgg = await basePrisma.transaction.aggregate({
        where: { familyId, childProfileId: c.id, type: "EXPENSE", date: { gte: start, lte: end } },
        _sum: { amount: true },
      });
      const spent = spentAgg._sum.amount ?? 0;
      budgetAchievement = Math.max(0, Math.min(100, Math.round(((weeklyBudget - spent) / weeklyBudget) * 100)));
    }

    const parts = [quizAccuracy, budgetAchievement].filter((v): v is number => v !== null);
    const syncScore = parts.length > 0 ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;

    return {
      id: c.id, name: c.name, avatar: c.avatar, color: c.color,
      quizAccuracy, quizCount: total, budgetAchievement, syncScore,
    };
  }));

  // 総合スコア順(非公開ランキング)。スコア null は末尾。
  const ranked = [...rows].sort((a, b) => (b.syncScore ?? -1) - (a.syncScore ?? -1))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return NextResponse.json({
    weekStart: start, weekEnd: end, weeklyBudget, ranking: ranked,
  });
}
