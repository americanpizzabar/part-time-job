import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptisState } from "@/lib/optisServer";

export const dynamic = "force-dynamic";

export async function POST() {
  const state = await getOptisState();
  const updated = await prisma.optisState.update({
    where: { id: state.id },
    data: { wisdomPoints: state.wisdomPoints + 5 },
  });
  return NextResponse.json({ wisdomPoints: updated.wisdomPoints });
}
