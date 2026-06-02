import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateLearningProfile } from "@/lib/learningEngine";

export const dynamic = "force-dynamic";

export async function POST() {
  const profile = await getOrCreateLearningProfile();
  await prisma.learningProfile.update({
    where: { id: profile.id },
    data: { layerUpSeen: true },
  });
  return NextResponse.json({ ok: true });
}
