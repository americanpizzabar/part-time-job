import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";

export const dynamic = "force-dynamic";

function makeToken() {
  return Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
}

export async function GET() {
  const offers = await prisma.tradeOffer.findMany({
    where: { status: "OPEN", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(offers);
}

// トレードオファー作成: オファー側がパーツを「エスクロー」に預ける
export async function POST(req: Request) {
  const { offerPartId, wantPartId } = await req.json();
  if (!offerPartId) return NextResponse.json({ error: "渡すパーツを選んでください" }, { status: 400 });

  const state = await getOptisState();
  const unlocked = parseUnlocked(state.unlockedParts);
  if (!unlocked.includes(offerPartId)) {
    return NextResponse.json({ error: "所持していないパーツです" }, { status: 400 });
  }

  // 装備中パーツはトレード不可(COMMON除く)
  const equipped = [state.equippedBody, state.equippedAura, state.equippedAccessory];
  if (equipped.includes(offerPartId) && offerPartId !== "body_core" && offerPartId !== "aura_basic") {
    return NextResponse.json({ error: "装備中のパーツはトレードできません" }, { status: 400 });
  }

  // エスクロー: アンロック済みリストから一時的に除去
  const newUnlocked = unlocked.filter(id => id !== offerPartId);
  await prisma.optisState.update({
    where: { id: state.id },
    data: { unlockedParts: JSON.stringify(newUnlocked) },
  });

  let token = makeToken();
  while (await prisma.tradeOffer.findUnique({ where: { token } })) token = makeToken();

  const offer = await prisma.tradeOffer.create({
    data: {
      offerPartId,
      wantPartId: wantPartId ?? null,
      token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分
    },
  });
  return NextResponse.json(offer, { status: 201 });
}
