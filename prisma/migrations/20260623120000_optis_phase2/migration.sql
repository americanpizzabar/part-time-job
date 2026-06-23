-- AggregationConfig: デイリー報酬クイズの親設定
ALTER TABLE "AggregationConfig" ADD COLUMN "quizBonusPerCorrect" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AggregationConfig" ADD COLUMN "quizBonusDailyCap" DOUBLE PRECISION;
ALTER TABLE "AggregationConfig" ADD COLUMN "quizBonusHardBoost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- OptisState: 錬金素材(生データ)
ALTER TABLE "OptisState" ADD COLUMN "rawData" INTEGER NOT NULL DEFAULT 0;

-- QuizBonusEarning: ボーナスプール台帳(1日1件・冪等)
CREATE TABLE "QuizBonusEarning" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isHardPod" BOOLEAN NOT NULL DEFAULT false,
    "earnedDate" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3),
    "settledPeriodId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familyId" TEXT NOT NULL DEFAULT 'default-family',
    "childProfileId" TEXT,

    CONSTRAINT "QuizBonusEarning_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuizBonusEarning_familyId_childProfileId_earnedDate_key" ON "QuizBonusEarning"("familyId", "childProfileId", "earnedDate");
CREATE INDEX "QuizBonusEarning_familyId_idx" ON "QuizBonusEarning"("familyId");
CREATE INDEX "QuizBonusEarning_childProfileId_idx" ON "QuizBonusEarning"("childProfileId");

-- ShadowGhost: 週替わりAIライバル
CREATE TABLE "ShadowGhost" (
    "id" SERIAL NOT NULL,
    "weekKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "brainType" TEXT NOT NULL,
    "targetScore" DOUBLE PRECISION NOT NULL,
    "rewardPartId" TEXT NOT NULL,
    "defeated" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familyId" TEXT NOT NULL DEFAULT 'default-family',
    "childProfileId" TEXT,

    CONSTRAINT "ShadowGhost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShadowGhost_familyId_childProfileId_weekKey_key" ON "ShadowGhost"("familyId", "childProfileId", "weekKey");
CREATE INDEX "ShadowGhost_familyId_idx" ON "ShadowGhost"("familyId");
CREATE INDEX "ShadowGhost_childProfileId_idx" ON "ShadowGhost"("childProfileId");

-- MainframeSolve: 隔週ソロ攻略の解答記録
CREATE TABLE "MainframeSolve" (
    "id" SERIAL NOT NULL,
    "cycleKey" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familyId" TEXT NOT NULL DEFAULT 'default-family',
    "childProfileId" TEXT,

    CONSTRAINT "MainframeSolve_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MainframeSolve_familyId_childProfileId_cycleKey_key" ON "MainframeSolve"("familyId", "childProfileId", "cycleKey");
CREATE INDEX "MainframeSolve_familyId_idx" ON "MainframeSolve"("familyId");
CREATE INDEX "MainframeSolve_childProfileId_idx" ON "MainframeSolve"("childProfileId");
