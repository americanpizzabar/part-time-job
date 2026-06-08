-- Link Mercari sales to their income transaction for edit/delete sync
ALTER TABLE "MercariSale" ADD COLUMN "transactionId" INTEGER;
