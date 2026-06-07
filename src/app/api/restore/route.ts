import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applySnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { restoreCode?: string };
  const code = body.restoreCode?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: "復元コードが見つかりません" }, { status: 404 });
  }

  const snap = await prisma.backupSnapshot.findUnique({
    where: { restoreCode: code },
  });

  if (!snap) {
    return NextResponse.json({ error: "復元コードが見つかりません" }, { status: 404 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(snap.payload) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "復元コードが見つかりません" }, { status: 404 });
  }

  await applySnapshot(payload);

  return NextResponse.json({ ok: true, restoredFrom: snap.createdAt });
}
