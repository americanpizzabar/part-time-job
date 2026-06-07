-- AlterTable: NewsQuiz genre
ALTER TABLE "NewsQuiz" ADD COLUMN "genre" TEXT NOT NULL DEFAULT 'CURRENT';

-- AlterTable: QuizAttempt genre + question snapshot
ALTER TABLE "QuizAttempt" ADD COLUMN "genre" TEXT NOT NULL DEFAULT 'CURRENT';
ALTER TABLE "QuizAttempt" ADD COLUMN "questionText" TEXT;

-- AlterTable: LearningProfile parent settings
ALTER TABLE "LearningProfile" ADD COLUMN "genreCurrent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LearningProfile" ADD COLUMN "genreEconomy" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LearningProfile" ADD COLUMN "genreEnglish" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LearningProfile" ADD COLUMN "genreLogic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LearningProfile" ADD COLUMN "levelCap" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: OptisState mercari + trader
ALTER TABLE "OptisState" ADD COLUMN "mercariTotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OptisState" ADD COLUMN "traderUnlocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: MercariSale
CREATE TABLE "MercariSale" (
    "id" SERIAL NOT NULL,
    "itemName" TEXT,
    "amount" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MercariSale_pkey" PRIMARY KEY ("id")
);
