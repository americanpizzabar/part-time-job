-- GiftMoney: お年玉・お祝い金(別管理の特別残高)
CREATE TABLE "GiftMoney" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "fromWhom" TEXT,
    "note" TEXT,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familyId" TEXT NOT NULL DEFAULT 'default-family',
    "childProfileId" TEXT,

    CONSTRAINT "GiftMoney_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GiftMoney_familyId_idx" ON "GiftMoney"("familyId");
CREATE INDEX "GiftMoney_childProfileId_idx" ON "GiftMoney"("childProfileId");
