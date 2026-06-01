-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "reportedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AggregationConfig" ADD COLUMN "weeklyBudget" INTEGER;

-- CreateTable
CREATE TABLE "OptisState" (
    "id" SERIAL NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "creditScore" INTEGER NOT NULL DEFAULT 50,
    "theme" TEXT NOT NULL DEFAULT 'normal',
    "equippedBody" TEXT NOT NULL DEFAULT 'body_core',
    "equippedAura" TEXT NOT NULL DEFAULT 'aura_basic',
    "equippedAccessory" TEXT,
    "unlockedParts" TEXT NOT NULL DEFAULT '["body_core","aura_basic"]',
    "lastSpinDate" TEXT,
    "lastChestWeek" TEXT,
    "nmdDate" TEXT,
    "freezeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptisState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardLog" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rewardType" TEXT NOT NULL,
    "rewardCash" INTEGER,
    "rewardPart" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);
