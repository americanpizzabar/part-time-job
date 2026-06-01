-- AlterTable: add langMode to OptisState
ALTER TABLE "OptisState" ADD COLUMN "langMode" TEXT NOT NULL DEFAULT 'JA';

-- AlterTable: add assetCategory to Transaction
ALTER TABLE "Transaction" ADD COLUMN "assetCategory" TEXT;

-- CreateTable: EconomicWeather
CREATE TABLE "EconomicWeather" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "magnitude" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EconomicWeather_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NewsQuiz
CREATE TABLE "NewsQuiz" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "weatherType" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsQuiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable: QuizAttempt
CREATE TABLE "QuizAttempt" (
    "id" SERIAL NOT NULL,
    "quizId" INTEGER NOT NULL,
    "selectedIndex" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "shieldUntil" TIMESTAMP(3),
    "expGained" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IndexFund
CREATE TABLE "IndexFund" (
    "id" SERIAL NOT NULL,
    "invested" INTEGER NOT NULL DEFAULT 0,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "parentMatchRate" INTEGER NOT NULL DEFAULT 0,
    "baseReturnRate" INTEGER NOT NULL DEFAULT 5,
    "lastReturnAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IndexFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IndexFundTx
CREATE TABLE "IndexFundTx" (
    "id" SERIAL NOT NULL,
    "fundId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IndexFundTx_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "NewsQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexFundTx" ADD CONSTRAINT "IndexFundTx_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "IndexFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
