import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSnapshot, generateRestoreCode } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  const [newest, count, withCode] = await Promise.all([
    prisma.backupSnapshot.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.backupSnapshot.count(),
    prisma.backupSnapshot.count({ where: { restoreCode: { not: null } } }),
  ]);

  return NextResponse.json({
    lastBackupAt: newest?.createdAt ?? null,
    count,
    hasRestoreCode: withCode > 0,
    autoSync: true,
    serverTime: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    note?: string;
    issueCode?: boolean;
  };

  const payload = await buildSnapshot();
  const payloadStr = JSON.stringify(payload);

  let restoreCode: string | null = null;
  if (body.issueCode) {
    // 衝突したら最大5回までリトライ
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateRestoreCode();
      const existing = await prisma.backupSnapshot.findUnique({
        where: { restoreCode: candidate },
      });
      if (!existing) {
        restoreCode = candidate;
        break;
      }
    }
  }

  const snap = await prisma.backupSnapshot.create({
    data: {
      payload: payloadStr,
      restoreCode,
      note: body.note?.trim() || null,
      issuedBy: "PARENT",
    },
  });

  return NextResponse.json({
    ok: true,
    id: snap.id,
    restoreCode,
    createdAt: snap.createdAt,
  });
}
