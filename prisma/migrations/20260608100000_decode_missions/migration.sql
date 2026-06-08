-- Data Decode missions for Dark Web Intelligence mode
CREATE TABLE "DecodeMission" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "dataset" TEXT,
    "question" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "expReward" INTEGER NOT NULL DEFAULT 40,
    "gcoinReward" INTEGER NOT NULL DEFAULT 15,
    "rewardPartId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "solvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecodeMission_pkey" PRIMARY KEY ("id")
);
