import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";
import { getOptisState, parseUnlocked, computeDerived, detectNmdFraud } from "@/lib/optisServer";
import { getPart } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function GET() {
  let state = await getOptisState();

  // 後出し不正検知 → 24時間の凍結
  if (state.nmdDate) {
    const fraud = await detectNmdFraud(state.nmdDate);
    const frozen = state.freezeUntil && state.freezeUntil > new Date();
    if (fraud && !frozen) {
      state = await prisma.optisState.update({
        where: { id: state.id },
        data: {
          freezeUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          nmdDate: null,
          creditScore: Math.max(0, state.creditScore - 15),
        },
      });
    }
  }

  const derived = await computeDerived(state.experience);
  const unlocked = parseUnlocked(state.unlockedParts);
  const frozen = !!(state.freezeUntil && state.freezeUntil > new Date());

  // 物欲アーカイブ: 貯金として我慢できた金額の総計
  const savings = await prisma.savingsTransaction.findMany({ orderBy: { date: "desc" } });
  const resistedTotal = savings.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0);

  const todayStr = today();

  return NextResponse.json({
    id: state.id,
    experience: state.experience,
    creditScore: state.creditScore,
    theme: state.theme,
    equippedBody: state.equippedBody,
    equippedAura: state.equippedAura,
    equippedAccessory: state.equippedAccessory,
    unlocked,
    unlockedParts: unlocked.map(id => getPart(id)).filter(Boolean),
    spunToday: state.lastSpinDate === todayStr,
    nmdToday: state.nmdDate === todayStr,
    frozen,
    freezeUntil: state.freezeUntil,
    ...derived,
    archive: {
      resistedTotal,
      items: savings.filter(s => s.amount > 0).slice(0, 20),
    },
  });
}

// パーツ装備
export async function POST(req: Request) {
  const state = await getOptisState();
  const body = await req.json();
  const { partId, type } = body as { partId: string; type: string };
  const unlocked = parseUnlocked(state.unlockedParts);
  if (!unlocked.includes(partId)) {
    return NextResponse.json({ error: "未所持のパーツです" }, { status: 400 });
  }
  const part = getPart(partId);
  if (!part || part.type !== type) {
    return NextResponse.json({ error: "パーツ種別が不正です" }, { status: 400 });
  }
  const data: Record<string, string | null> = {};
  if (type === "body") data.equippedBody = partId;
  else if (type === "aura") data.equippedAura = partId;
  else if (type === "accessory") data.equippedAccessory = partId;

  const updated = await prisma.optisState.update({ where: { id: state.id }, data });
  return NextResponse.json(updated);
}
