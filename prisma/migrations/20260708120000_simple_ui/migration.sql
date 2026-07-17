-- 簡易UI(お手伝い+お年玉のみのスリムモード)の親設定
ALTER TABLE "AggregationConfig" ADD COLUMN "simpleUi" BOOLEAN NOT NULL DEFAULT false;
