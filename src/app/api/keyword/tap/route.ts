import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";
import { getEquippedEffects } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function POST() {
  const state = await getOptisState();
  const effects = getEquippedEffects(state.equippedBody, state.equippedAura, state.equippedAccessory);
  const gain = 5 + (effects.wisdomBonus ?? 0);
  const updated = await prisma.optisState.update({
    where: { id: state.id },
    data: { wisdomPoints: state.wisdomPoints + gain },
  });
  return NextResponse.json({ wisdomPoints: updated.wisdomPoints, gain });
}
