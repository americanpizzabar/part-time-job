-- AlterTable
ALTER TABLE "OptisState" ADD COLUMN "gcoins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Guild" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "auraColor" TEXT NOT NULL DEFAULT '#06b6d4',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Guild_inviteCode_key" ON "Guild"("inviteCode");

-- CreateTable
CREATE TABLE "GuildMembership" (
    "id" SERIAL NOT NULL,
    "guildId" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "budgetMetWeek" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuildMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GuildMembership_guildId_nickname_key" ON "GuildMembership"("guildId", "nickname");
ALTER TABLE "GuildMembership" ADD CONSTRAINT "GuildMembership_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "TradeOffer" (
    "id" SERIAL NOT NULL,
    "offerPartId" TEXT NOT NULL,
    "wantPartId" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TradeOffer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TradeOffer_token_key" ON "TradeOffer"("token");

-- CreateTable
CREATE TABLE "OutcomeReport" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "metric" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rewardPart" TEXT,
    "parentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    CONSTRAINT "OutcomeReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualBankDeposit" (
    "id" SERIAL NOT NULL,
    "principal" INTEGER NOT NULL,
    "depositDate" TEXT NOT NULL,
    "maturityDate" TEXT NOT NULL,
    "ratePercent" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "interestEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    CONSTRAINT "VirtualBankDeposit_pkey" PRIMARY KEY ("id")
);
