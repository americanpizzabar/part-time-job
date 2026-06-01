import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";
import { getOptisState } from "@/lib/optisServer";

export const dynamic = "force-dynamic";

// ノーマネーデー(放課後に支出なし)を申告 → 当日ルーレット確変
export async function POST(req: Request) {
  const state = await getOptisState();
  const body = await req.json().catch(() => ({}));
  const todayStr = today();

  if (body.noSpending === false) {
    // 支出ありと回答 → NMDフラグは立てない
    return NextResponse.json({ nmd: false });
  }

  const updated = await prisma.optisState.update({
    where: { id: state.id },
    data: {
      nmdDate: todayStr,
      creditScore: Math.min(100, state.creditScore + 2),
    },
  });
  return NextResponse.json({ nmd: true, nmdDate: updated.nmdDate });
}
