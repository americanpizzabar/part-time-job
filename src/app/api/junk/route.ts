import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState, parseUnlocked } from "@/lib/optisServer";
import {
  getPart, rawDataForPart, CRAFT_COST, CRAFT_PART_IDS, UNDISASSEMBLABLE,
} from "@/lib/optis";

export const dynamic = "force-dynamic";

// 所持パーツ(分解候補)・生データ残量・合成情報を返す。
export async function GET() {
  const state = await getOptisState();
  const unlocked = parseUnlocked(state.unlockedParts);
  const equipped = new Set([state.equippedBody, state.equippedAura, state.equippedAccessory].filter(Boolean) as string[]);

  const disassemblable = unlocked
    .filter(id => !UNDISASSEMBLABLE.has(id) && !equipped.has(id))
    .map(id => {
      const p = getPart(id);
      return p ? { id: p.id, name: p.name, emoji: p.emoji ?? "✨", rarity: p.rarity, raw: rawDataForPart(id) } : null;
    })
    .filter(Boolean);

  const craftPool = CRAFT_PART_IDS.map(id => {
    const p = getPart(id)!;
    return { id: p.id, name: p.name, emoji: p.emoji ?? "✨", rarity: p.rarity, owned: unlocked.includes(id), vocab: p.vocab ?? null };
  });

  return NextResponse.json({
    rawData: state.rawData,
    craftCost: CRAFT_COST,
    canCraft: state.rawData >= CRAFT_COST && craftPool.some(c => !c.owned),
    disassemblable,
    craftPool,
  });
}

export async function POST(req: Request) {
  const state = await getOptisState();
  const body = await req.json();
  const { action, partId } = body as { action: "disassemble" | "craft"; partId?: string };
  const unlocked = parseUnlocked(state.unlockedParts);
  const equipped = new Set([state.equippedBody, state.equippedAura, state.equippedAccessory].filter(Boolean) as string[]);

  if (action === "disassemble") {
    if (!partId || !unlocked.includes(partId)) {
      return NextResponse.json({ error: "所持していないパーツです" }, { status: 400 });
    }
    if (UNDISASSEMBLABLE.has(partId)) {
      return NextResponse.json({ error: "基本パーツは分解できません" }, { status: 400 });
    }
    if (equipped.has(partId)) {
      return NextResponse.json({ error: "装備中のパーツは分解できません" }, { status: 400 });
    }
    const gained = rawDataForPart(partId);
    const next = unlocked.filter(id => id !== partId);
    const updated = await prisma.optisState.update({
      where: { id: state.id },
      data: { unlockedParts: JSON.stringify(next), rawData: state.rawData + gained },
    });
    return NextResponse.json({ ok: true, gained, rawData: updated.rawData });
  }

  if (action === "craft") {
    if (state.rawData < CRAFT_COST) {
      return NextResponse.json({ error: `生データが不足しています(必要 ${CRAFT_COST})` }, { status: 400 });
    }
    // 未所持のクラフトパーツ候補。指定があればそれを優先。
    const candidates = CRAFT_PART_IDS.filter(id => !unlocked.includes(id));
    if (candidates.length === 0) {
      return NextResponse.json({ error: "密造できる特級パーツは全て入手済みです" }, { status: 400 });
    }
    const chosen = partId && candidates.includes(partId)
      ? partId
      : candidates[Math.floor(Math.random() * candidates.length)];
    const next = [...unlocked, chosen];
    const updated = await prisma.optisState.update({
      where: { id: state.id },
      data: { unlockedParts: JSON.stringify(next), rawData: state.rawData - CRAFT_COST },
    });
    const part = getPart(chosen);
    await prisma.rewardLog.create({
      data: {
        source: "CRAFT",
        rarity: part?.rarity ?? "LEGENDARY",
        rewardId: chosen,
        label: `密造: ${part?.emoji ?? "✨"} ${part?.name ?? chosen}`,
        date: new Date().toISOString().slice(0, 10),
      },
    });
    return NextResponse.json({
      ok: true,
      rawData: updated.rawData,
      part: part ? { id: part.id, name: part.name, emoji: part.emoji ?? "✨", rarity: part.rarity, vocab: part.vocab ?? null } : null,
    });
  }

  return NextResponse.json({ error: "不正なアクションです" }, { status: 400 });
}
