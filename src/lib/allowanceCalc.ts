import { prisma } from "@/lib/prisma";
import { isChoreScheduledForDate, getDateRange } from "@/lib/dateUtils";

export interface ChoreBreakdown {
  name: string;
  amount: number;
  scheduled: number;
  completed: number;
  // 実際に稼いだ額(amountOverride 反映後)。表示は必ずこれを使う。
  // 「completed × amount」は親が金額を修整していると実額とズレるため。
  earned: number;
}

export interface AllowanceCalcResult {
  baseAmount: number;
  choreAmount: number;
  totalAmount: number;
  choreDetails: Record<string, ChoreBreakdown>;
}

/**
 * 期間内のお小遣いを集計する。
 *
 * 単一の正: 「完了した ChoreLog 1件 = その金額を1回稼いだ」。
 *  - 完了をスケジュール状態でゲートしない。完了後にスケジュールを変更/無効化
 *    しても「やった分は払う」を保証する。
 *  - 完了ログの件数をそのまま数えるので、日付の取りこぼし(タイムゾーン等)や
 *    同日複数ログ(通常+追加)の潰れが起きない。
 *  - /api/stats・/api/logs と同じ定義を共有して画面間のズレを防ぐ。
 *
 * scheduled(予定回数)は表示用の「X/Y回」のためだけに使う。
 *  予定日数 + 予定外で完了した日数を機会として数え、必ず completed ≤ scheduled になるようにする。
 */
export async function calculateAllowance(
  startDate: string,
  endDate: string
): Promise<AllowanceCalcResult> {
  const allowanceConfig = await prisma.allowanceConfig.findFirst({
    orderBy: { createdAt: "desc" },
  });

  // 無効化されたお手伝いでも、期間内に完了ログがあれば「稼いだお金」として集計する
  // (無効化で過去に稼いだ分が消えないように)
  const chores = await prisma.chore.findMany({
    where: {
      OR: [
        { isActive: true },
        { logs: { some: { date: { gte: startDate, lte: endDate }, completed: true } } },
      ],
    },
    include: {
      schedules: { where: { isActive: true } },
      logs: { where: { date: { gte: startDate, lte: endDate }, completed: true } },
    },
  });

  const dates = getDateRange(
    startDate,
    Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
  ).filter(d => d <= endDate);

  const choreDetails: Record<string, ChoreBreakdown> = {};
  let choreAmount = 0;

  for (const chore of chores) {
    // 完了回数 = 完了ログの件数。各 ChoreLog が1回の完了。
    // 同日に通常+追加の2件があれば2回として扱う(2回やった=2回分払う)。
    const completedDays = chore.logs.length;
    // 実効金額: 親が amountOverride を設定している場合はそれを使用する
    const logSum = chore.logs.reduce(
      (s, log) => s + ((log as { amountOverride?: number | null }).amountOverride ?? chore.amount),
      0
    );

    // 予定回数: 現在のスケジュールでの予定日数
    let scheduledDays = 0;
    for (const date of dates) {
      if (chore.schedules.some(s => isChoreScheduledForDate({ ...s }, date))) {
        scheduledDays++;
      }
    }
    // 予定外の日に完了した分も「機会」として加算する
    const completedDates = new Set(chore.logs.map(l => l.date));
    for (const date of completedDates) {
      if (!chore.schedules.some(s => isChoreScheduledForDate({ ...s }, date))) {
        scheduledDays++;
      }
    }
    // completed ≤ scheduled を必ず保証(同日複数完了などの取りこぼし防止)
    scheduledDays = Math.max(scheduledDays, completedDays);

    choreAmount += logSum;

    if (scheduledDays > 0 || completedDays > 0) {
      // 同名お手伝いでも上書きされないよう chore.id をキーにする
      choreDetails[String(chore.id)] = {
        name: chore.name,
        amount: chore.amount,
        scheduled: scheduledDays,
        completed: completedDays,
        earned: logSum,
      };
    }
  }

  // デイリー報酬クイズのボーナス/ペナルティは「その日のお手伝い」として集計に組み込む。
  // (週末に別途精算するのではなく、日々のお手伝い実績と一緒に貯まる)
  // 正の行=正解ボーナス、負の行=ウイルス・ペナルティ(未回答日の翌日強奪)。
  const quizBonuses = await prisma.quizBonusEarning.findMany({
    where: { earnedDate: { gte: startDate, lte: endDate } },
  });
  const bonusRows = quizBonuses.filter(b => b.amount > 0);
  const penaltyRows = quizBonuses.filter(b => b.amount < 0);
  const bonusTotal = bonusRows.reduce((s, b) => s + b.amount, 0);
  const penaltyTotal = penaltyRows.reduce((s, b) => s + b.amount, 0); // 負値
  choreAmount += bonusTotal + penaltyTotal;

  if (bonusTotal > 0) {
    choreDetails["quizbonus"] = {
      name: bonusRows.length > 1 ? `🧠 クイズ正解ボーナス（${bonusRows.length}日分）` : "🧠 クイズ正解ボーナス",
      amount: bonusTotal,
      scheduled: 1,
      completed: 1,
      earned: bonusTotal,
    };
  }
  if (penaltyTotal < 0) {
    choreDetails["quizpenalty"] = {
      name: penaltyRows.length > 1 ? `🦠 ウイルス被害（${penaltyRows.length}日分）` : "🦠 ウイルス被害",
      amount: penaltyTotal,
      scheduled: 1,
      completed: 1,
      earned: penaltyTotal,
    };
  }

  const baseAmount = allowanceConfig?.amount ?? 0;
  const totalAmount = baseAmount + choreAmount;

  return { baseAmount, choreAmount, totalAmount, choreDetails };
}
