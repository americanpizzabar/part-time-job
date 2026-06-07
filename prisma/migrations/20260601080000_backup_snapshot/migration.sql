-- CreateTable: BackupSnapshot
CREATE TABLE "BackupSnapshot" (
    "id" SERIAL NOT NULL,
    "payload" TEXT NOT NULL,
    "restoreCode" TEXT,
    "note" TEXT,
    "issuedBy" TEXT NOT NULL DEFAULT 'PARENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackupSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BackupSnapshot_restoreCode_key" ON "BackupSnapshot"("restoreCode");
