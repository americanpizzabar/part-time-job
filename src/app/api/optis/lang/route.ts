import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";
import { levelFromExp, generationBonus } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const body = await req.json();
  const { langMode } = body as { langMode: "JA" | "EN" };

  if (!langMode || !["JA", "EN"].includes(langMode)) {
    return NextResponse.json({ error: "langMode must be JA or EN" }, { status: 400 });
  }

  const state = await getOptisState();

  if (langMode === "EN") {
    // Check level requirement
    const gen = state.generation ?? 1;
    const genBonus = generationBonus(gen);
    const effectiveExp = Math.round(state.experience * genBonus.expMultiplier);
    const { level } = levelFromExp(effectiveExp);
    if (level < 8) {
      return NextResponse.json({ error: "英語モードはLv.8以上で解放されます" }, { status: 403 });
    }
  }

  const updated = await prisma.optisState.update({
    where: { id: state.id },
    data: { langMode },
  });

  return NextResponse.json({ langMode: updated.langMode });
}
