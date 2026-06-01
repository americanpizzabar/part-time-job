-- AlterTable: add wisdomPoints to OptisState
ALTER TABLE "OptisState" ADD COLUMN "wisdomPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: DailyKeyword
CREATE TABLE "DailyKeyword" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "ruby" TEXT,
    "english" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '💡',
    "gradient" TEXT NOT NULL DEFAULT 'economy',
    "body" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WordMission
CREATE TABLE "WordMission" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "hint" TEXT NOT NULL,
    "expReward" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "solvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WordMission_pkey" PRIMARY KEY ("id")
);
