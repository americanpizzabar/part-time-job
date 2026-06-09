-- マルチテナント化: Family コンテナ + 全テーブルに familyId 列を追加
-- 既存データは 'default-family' に帰属(現行家族のデータ移行パス)

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'マイファミリー',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PairingCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PairingCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FamilyMember_token_key" ON "FamilyMember"("token");
CREATE INDEX "FamilyMember_familyId_idx" ON "FamilyMember"("familyId");
CREATE UNIQUE INDEX "PairingCode_code_key" ON "PairingCode"("code");

ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_familyId_fkey"
  FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PairingCode" ADD CONSTRAINT "PairingCode_familyId_fkey"
  FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 既存データの受け皿となるデフォルト家族
INSERT INTO "Family" ("id", "name") VALUES ('default-family', 'マイファミリー')
  ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "AllowanceConfig" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "AllowanceConfig_familyId_idx" ON "AllowanceConfig"("familyId");
ALTER TABLE "AggregationConfig" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "AggregationConfig_familyId_idx" ON "AggregationConfig"("familyId");
ALTER TABLE "Chore" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "Chore_familyId_idx" ON "Chore"("familyId");
ALTER TABLE "ChoreSchedule" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "ChoreSchedule_familyId_idx" ON "ChoreSchedule"("familyId");
ALTER TABLE "ChoreLog" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "ChoreLog_familyId_idx" ON "ChoreLog"("familyId");
ALTER TABLE "AllowancePeriod" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "AllowancePeriod_familyId_idx" ON "AllowancePeriod"("familyId");
ALTER TABLE "Transaction" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "Transaction_familyId_idx" ON "Transaction"("familyId");
ALTER TABLE "SavingsGoal" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "SavingsGoal_familyId_idx" ON "SavingsGoal"("familyId");
ALTER TABLE "SavingsTransaction" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "SavingsTransaction_familyId_idx" ON "SavingsTransaction"("familyId");
ALTER TABLE "PresentationRequest" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "PresentationRequest_familyId_idx" ON "PresentationRequest"("familyId");
ALTER TABLE "OptisState" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "OptisState_familyId_idx" ON "OptisState"("familyId");
ALTER TABLE "Project" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "Project_familyId_idx" ON "Project"("familyId");
ALTER TABLE "ProjectContribution" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "ProjectContribution_familyId_idx" ON "ProjectContribution"("familyId");
ALTER TABLE "RewardLog" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "RewardLog_familyId_idx" ON "RewardLog"("familyId");
ALTER TABLE "OutfitSet" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "OutfitSet_familyId_idx" ON "OutfitSet"("familyId");
ALTER TABLE "Mission" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "Mission_familyId_idx" ON "Mission"("familyId");
ALTER TABLE "Guild" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "Guild_familyId_idx" ON "Guild"("familyId");
ALTER TABLE "GuildMembership" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "GuildMembership_familyId_idx" ON "GuildMembership"("familyId");
ALTER TABLE "TradeOffer" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "TradeOffer_familyId_idx" ON "TradeOffer"("familyId");
ALTER TABLE "OutcomeReport" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "OutcomeReport_familyId_idx" ON "OutcomeReport"("familyId");
ALTER TABLE "PartMarketPrice" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "PartMarketPrice_familyId_idx" ON "PartMarketPrice"("familyId");
ALTER TABLE "MemoryCube" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "MemoryCube_familyId_idx" ON "MemoryCube"("familyId");
ALTER TABLE "FamilyLoan" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "FamilyLoan_familyId_idx" ON "FamilyLoan"("familyId");
ALTER TABLE "FeedItem" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "FeedItem_familyId_idx" ON "FeedItem"("familyId");
ALTER TABLE "VirtualBankDeposit" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "VirtualBankDeposit_familyId_idx" ON "VirtualBankDeposit"("familyId");
ALTER TABLE "EconomicWeather" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "EconomicWeather_familyId_idx" ON "EconomicWeather"("familyId");
ALTER TABLE "NewsQuiz" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "NewsQuiz_familyId_idx" ON "NewsQuiz"("familyId");
ALTER TABLE "QuizAttempt" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "QuizAttempt_familyId_idx" ON "QuizAttempt"("familyId");
ALTER TABLE "IndexFund" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "IndexFund_familyId_idx" ON "IndexFund"("familyId");
ALTER TABLE "IndexFundTx" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "IndexFundTx_familyId_idx" ON "IndexFundTx"("familyId");
ALTER TABLE "DailyKeyword" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "DailyKeyword_familyId_idx" ON "DailyKeyword"("familyId");
ALTER TABLE "WordMission" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "WordMission_familyId_idx" ON "WordMission"("familyId");
ALTER TABLE "LearningProfile" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "LearningProfile_familyId_idx" ON "LearningProfile"("familyId");
ALTER TABLE "MercariSale" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "MercariSale_familyId_idx" ON "MercariSale"("familyId");
ALTER TABLE "BackupSnapshot" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "BackupSnapshot_familyId_idx" ON "BackupSnapshot"("familyId");
ALTER TABLE "MarketTrade" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "MarketTrade_familyId_idx" ON "MarketTrade"("familyId");
ALTER TABLE "DecodeMission" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default-family';
CREATE INDEX "DecodeMission_familyId_idx" ON "DecodeMission"("familyId");

-- PartMarketPrice: partId のグローバル一意を家族内一意に変更
DROP INDEX "PartMarketPrice_partId_key";
CREATE UNIQUE INDEX "PartMarketPrice_familyId_partId_key" ON "PartMarketPrice"("familyId", "partId");
