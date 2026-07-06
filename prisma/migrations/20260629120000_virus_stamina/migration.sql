-- ウイルス・ペナルティ(損失回避トラップ) + Optisスタミナ(飢餓)システム
ALTER TABLE "AggregationConfig" ADD COLUMN "quizPenaltyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AggregationConfig" ADD COLUMN "staminaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "QuizBonusEarning" ADD COLUMN "isPenalty" BOOLEAN NOT NULL DEFAULT false;
