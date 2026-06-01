-- AlterTable: add generation to OptisState
ALTER TABLE "OptisState" ADD COLUMN "generation" INTEGER NOT NULL DEFAULT 1;

-- CreateTable: PartMarketPrice
CREATE TABLE "PartMarketPrice" (
    "id" SERIAL NOT NULL,
    "partId" TEXT NOT NULL,
    "currentPrice" INTEGER NOT NULL,
    "totalBought" INTEGER NOT NULL DEFAULT 0,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "history" JSONB NOT NULL DEFAULT '[]',
    CONSTRAINT "PartMarketPrice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PartMarketPrice_partId_key" ON "PartMarketPrice"("partId");

-- CreateTable: MemoryCube
CREATE TABLE "MemoryCube" (
    "id" SERIAL NOT NULL,
    "generation" INTEGER NOT NULL,
    "form" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "awakening" INTEGER NOT NULL,
    "creditScore" INTEGER NOT NULL,
    "crystallizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nickname" TEXT,
    CONSTRAINT "MemoryCube_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FamilyLoan
CREATE TABLE "FamilyLoan" (
    "id" SERIAL NOT NULL,
    "purpose" TEXT NOT NULL,
    "principal" INTEGER NOT NULL,
    "months" INTEGER NOT NULL,
    "monthlyPayment" INTEGER NOT NULL,
    "interestPerMonth" INTEGER NOT NULL DEFAULT 0,
    "paidMonths" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "parentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "FamilyLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FeedItem
CREATE TABLE "FeedItem" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'NEWS',
    "effectJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "FeedItem_pkey" PRIMARY KEY ("id")
);
