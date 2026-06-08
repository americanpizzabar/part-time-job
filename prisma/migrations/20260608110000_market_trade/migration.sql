-- CreateTable
CREATE TABLE "MarketTrade" (
    "id" SERIAL NOT NULL,
    "partId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketTrade_pkey" PRIMARY KEY ("id")
);
