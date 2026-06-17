-- ランチ写真の栄養解析フィールドを Transaction に追加
ALTER TABLE "Transaction" ADD COLUMN "nutriStaple"    INTEGER;
ALTER TABLE "Transaction" ADD COLUMN "nutriProtein"   INTEGER;
ALTER TABLE "Transaction" ADD COLUMN "nutriVeg"       INTEGER;
ALTER TABLE "Transaction" ADD COLUMN "foodTitle"      TEXT;
ALTER TABLE "Transaction" ADD COLUMN "foodTitleEmoji" TEXT;
