-- AlterTable: add layer to NewsQuiz
ALTER TABLE "NewsQuiz" ADD COLUMN "layer" INTEGER NOT NULL DEFAULT 1;

-- AlterTable: add responseMs and layer to QuizAttempt
ALTER TABLE "QuizAttempt" ADD COLUMN "responseMs" INTEGER;
ALTER TABLE "QuizAttempt" ADD COLUMN "layer" INTEGER NOT NULL DEFAULT 1;

-- CreateTable: LearningProfile
CREATE TABLE "LearningProfile" (
    "id" SERIAL NOT NULL,
    "layer" INTEGER NOT NULL DEFAULT 1,
    "encounterRate" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "lastAnsweredAt" TIMESTAMP(3),
    "layerUpAt" TIMESTAMP(3),
    "layerUpSeen" BOOLEAN NOT NULL DEFAULT true,
    "parentAlertAt" TIMESTAMP(3),
    "parentBoosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningProfile_pkey" PRIMARY KEY ("id")
);
