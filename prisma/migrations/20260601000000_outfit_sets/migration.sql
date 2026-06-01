-- CreateTable
CREATE TABLE "OutfitSet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "equippedBody" TEXT NOT NULL,
    "equippedAura" TEXT NOT NULL,
    "equippedAccessory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutfitSet_pkey" PRIMARY KEY ("id")
);
