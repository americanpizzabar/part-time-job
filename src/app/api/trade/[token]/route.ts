import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const offer = await prisma.tradeOffer.findUnique({ where: { token: token.toUpperCase() } });
  if (!offer) return NextResponse.json({ error: "トークンが見つかりません" }, { status: 404 });
  if (offer.status !== "OPEN" || offer.expiresAt < new Date()) {
    return NextResponse.json({ error: "このトレードは期限切れまたは完了しています" }, { status: 410 });
  }
  return NextResponse.json(offer);
}

// トレード完了: 受け取り側が自分のパーツを渡してオファーパーツを受け取る
export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { givePartId } = await req.json();

  const offer = await prisma.tradeOffer.findUnique({ where: { token: token.toUpperCase() } });
  if (!offer || offer.status !== "OPEN" || offer.expiresAt < new Date()) {
    return NextResponse.json({ error: "トレードが無効です" }, { status: 410 });
  }
  if (offer.wantPartId && offer.wantPartId !== givePartId) {
    return NextResponse.json({ error: `このオファーは ${offer.wantPartId} との交換を希望しています` }, { status: 400 });
  }

  const state = await getOptisState();
  const unlocked = parseUnlocked(state.unlockedParts);
  if (!unlocked.includes(givePartId)) {
    return NextResponse.json({ error: "所持していないパーツです" }, { status: 400 });
  }

  // トレード実行: givePartId を失い、offerPartId を得る
  const newUnlocked = [...unlocked.filter(id => id !== givePartId), offer.offerPartId];
  await prisma.optisState.update({
    where: { id: state.id },
    data: { unlockedParts: JSON.stringify([...new Set(newUnlocked)]) },
  });
  await prisma.tradeOffer.update({ where: { token: offer.token }, data: { status: "COMPLETED" } });

  return NextResponse.json({ ok: true, gained: offer.offerPartId, lost: givePartId });
}

// キャンセル: エスクロー中のパーツを返却
export async function DELETE(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const offer = await prisma.tradeOffer.findUnique({ where: { token: token.toUpperCase() } });
  if (!offer || offer.status !== "OPEN") {
    return NextResponse.json({ error: "キャンセルできません" }, { status: 400 });
  }
  // エスクロー解除: パーツを返す
  const state = await getOptisState();
  const unlocked = parseUnlocked(state.unlockedParts);
  if (!unlocked.includes(offer.offerPartId)) {
    await prisma.optisState.update({
      where: { id: state.id },
      data: { unlockedParts: JSON.stringify([...unlocked, offer.offerPartId]) },
    });
  }
  await prisma.tradeOffer.update({ where: { token: offer.token }, data: { status: "EXPIRED" } });
  return NextResponse.json({ ok: true });
}
