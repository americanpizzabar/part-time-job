-- 招待コードに参加ロールを追加(親の追加招待に対応)
ALTER TABLE "PairingCode" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'CHILD';
