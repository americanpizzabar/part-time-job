-- 闇取引(BLACK DEAL): 1日1回の覆面ディーラー
CREATE TABLE "BlackDeal" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "legit" BOOLEAN NOT NULL,
    "inspected" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familyId" TEXT NOT NULL DEFAULT 'default-family',
    "childProfileId" TEXT,

    CONSTRAINT "BlackDeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlackDeal_familyId_childProfileId_date_key" ON "BlackDeal"("familyId", "childProfileId", "date");
CREATE INDEX "BlackDeal_familyId_idx" ON "BlackDeal"("familyId");
CREATE INDEX "BlackDeal_childProfileId_idx" ON "BlackDeal"("childProfileId");
