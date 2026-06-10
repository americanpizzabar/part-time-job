-- ============================================================
-- マルチチャイルド: 子プロファイル(きょうだい別データ分離)
-- 1家族(FamilyID)の中に、子供ごとの独立セクター(ChildProfile)を作る。
-- 既存データは各家族の「既定の子プロファイル」へ移行する。
-- ============================================================

-- 1. ChildProfile テーブル
CREATE TABLE "ChildProfile" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'こども',
  "avatar" TEXT NOT NULL DEFAULT '🧒',
  "color" TEXT NOT NULL DEFAULT '#3b82f6',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChildProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChildProfile_familyId_idx" ON "ChildProfile"("familyId");
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_familyId_fkey"
  FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. FamilyMember / PairingCode に childProfileId
ALTER TABLE "FamilyMember" ADD COLUMN "childProfileId" TEXT;
CREATE INDEX "FamilyMember_childProfileId_idx" ON "FamilyMember"("childProfileId");
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_childProfileId_fkey"
  FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PairingCode" ADD COLUMN "childProfileId" TEXT;

-- 3. 子スコープ各テーブルに childProfileId 列を追加
ALTER TABLE "ChoreLog" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "AllowancePeriod" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "SavingsGoal" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "SavingsTransaction" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "PresentationRequest" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "OptisState" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "Project" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "ProjectContribution" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "RewardLog" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "OutfitSet" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "Mission" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "GuildMembership" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "TradeOffer" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "OutcomeReport" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "PartMarketPrice" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "MemoryCube" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "FamilyLoan" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "FeedItem" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "VirtualBankDeposit" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "QuizAttempt" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "IndexFund" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "IndexFundTx" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "WordMission" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "LearningProfile" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "MercariSale" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "BackupSnapshot" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "MarketTrade" ADD COLUMN "childProfileId" TEXT;
ALTER TABLE "DecodeMission" ADD COLUMN "childProfileId" TEXT;

-- 4. バックフィル
-- 4a. 子スコープ行が参照する familyId で Family に存在しないものを補完(孤児防止)
INSERT INTO "Family" ("id", "name", "createdAt")
SELECT DISTINCT o."familyId", 'マイファミリー', CURRENT_TIMESTAMP
FROM "OptisState" o
LEFT JOIN "Family" f ON f."id" = o."familyId"
WHERE f."id" IS NULL;

-- 4b. 各家族に既定の子プロファイルを1つ作成
INSERT INTO "ChildProfile" ("id", "familyId", "name", "avatar", "color", "createdAt")
SELECT gen_random_uuid()::text, "id", 'こども', '🧒', '#3b82f6', CURRENT_TIMESTAMP
FROM "Family";

-- 4c. 既存の子スコープ行を、その家族の既定プロファイルへ割当
UPDATE "ChoreLog" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "AllowancePeriod" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "Transaction" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "SavingsGoal" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "SavingsTransaction" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "PresentationRequest" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "OptisState" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "Project" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "ProjectContribution" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "RewardLog" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "OutfitSet" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "Mission" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "GuildMembership" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "TradeOffer" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "OutcomeReport" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "PartMarketPrice" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "MemoryCube" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "FamilyLoan" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "FeedItem" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "VirtualBankDeposit" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "QuizAttempt" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "IndexFund" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "IndexFundTx" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "WordMission" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "LearningProfile" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "MercariSale" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "BackupSnapshot" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "MarketTrade" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;
UPDATE "DecodeMission" t SET "childProfileId" = cp."id" FROM "ChildProfile" cp WHERE cp."familyId" = t."familyId" AND t."childProfileId" IS NULL;

-- 4d. 既存の CHILD 端末を既定プロファイルに紐づけ
UPDATE "FamilyMember" m SET "childProfileId" = cp."id"
FROM "ChildProfile" cp
WHERE cp."familyId" = m."familyId" AND m."role" = 'CHILD' AND m."childProfileId" IS NULL;

-- 5. 子スコープ列のインデックス
CREATE INDEX "ChoreLog_childProfileId_idx" ON "ChoreLog"("childProfileId");
CREATE INDEX "AllowancePeriod_childProfileId_idx" ON "AllowancePeriod"("childProfileId");
CREATE INDEX "Transaction_childProfileId_idx" ON "Transaction"("childProfileId");
CREATE INDEX "SavingsGoal_childProfileId_idx" ON "SavingsGoal"("childProfileId");
CREATE INDEX "SavingsTransaction_childProfileId_idx" ON "SavingsTransaction"("childProfileId");
CREATE INDEX "PresentationRequest_childProfileId_idx" ON "PresentationRequest"("childProfileId");
CREATE INDEX "OptisState_childProfileId_idx" ON "OptisState"("childProfileId");
CREATE INDEX "Project_childProfileId_idx" ON "Project"("childProfileId");
CREATE INDEX "ProjectContribution_childProfileId_idx" ON "ProjectContribution"("childProfileId");
CREATE INDEX "RewardLog_childProfileId_idx" ON "RewardLog"("childProfileId");
CREATE INDEX "OutfitSet_childProfileId_idx" ON "OutfitSet"("childProfileId");
CREATE INDEX "Mission_childProfileId_idx" ON "Mission"("childProfileId");
CREATE INDEX "GuildMembership_childProfileId_idx" ON "GuildMembership"("childProfileId");
CREATE INDEX "TradeOffer_childProfileId_idx" ON "TradeOffer"("childProfileId");
CREATE INDEX "OutcomeReport_childProfileId_idx" ON "OutcomeReport"("childProfileId");
CREATE INDEX "PartMarketPrice_childProfileId_idx" ON "PartMarketPrice"("childProfileId");
CREATE INDEX "MemoryCube_childProfileId_idx" ON "MemoryCube"("childProfileId");
CREATE INDEX "FamilyLoan_childProfileId_idx" ON "FamilyLoan"("childProfileId");
CREATE INDEX "FeedItem_childProfileId_idx" ON "FeedItem"("childProfileId");
CREATE INDEX "VirtualBankDeposit_childProfileId_idx" ON "VirtualBankDeposit"("childProfileId");
CREATE INDEX "QuizAttempt_childProfileId_idx" ON "QuizAttempt"("childProfileId");
CREATE INDEX "IndexFund_childProfileId_idx" ON "IndexFund"("childProfileId");
CREATE INDEX "IndexFundTx_childProfileId_idx" ON "IndexFundTx"("childProfileId");
CREATE INDEX "WordMission_childProfileId_idx" ON "WordMission"("childProfileId");
CREATE INDEX "LearningProfile_childProfileId_idx" ON "LearningProfile"("childProfileId");
CREATE INDEX "MercariSale_childProfileId_idx" ON "MercariSale"("childProfileId");
CREATE INDEX "BackupSnapshot_childProfileId_idx" ON "BackupSnapshot"("childProfileId");
CREATE INDEX "MarketTrade_childProfileId_idx" ON "MarketTrade"("childProfileId");
CREATE INDEX "DecodeMission_childProfileId_idx" ON "DecodeMission"("childProfileId");

-- 6. 一意制約の更新(子プロファイルを含める)
ALTER TABLE "ChoreLog" DROP CONSTRAINT IF EXISTS "ChoreLog_choreId_date_isExtra_key";
DROP INDEX IF EXISTS "ChoreLog_choreId_date_isExtra_key";
CREATE UNIQUE INDEX "ChoreLog_choreId_date_isExtra_childProfileId_key" ON "ChoreLog"("choreId", "date", "isExtra", "childProfileId");

ALTER TABLE "PartMarketPrice" DROP CONSTRAINT IF EXISTS "PartMarketPrice_familyId_partId_key";
DROP INDEX IF EXISTS "PartMarketPrice_familyId_partId_key";
CREATE UNIQUE INDEX "PartMarketPrice_familyId_childProfileId_partId_key" ON "PartMarketPrice"("familyId", "childProfileId", "partId");
