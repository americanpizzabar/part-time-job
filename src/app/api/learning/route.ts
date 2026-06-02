import { NextResponse } from "next/server";
import { getOrCreateLearningProfile, LAYER_LABELS } from "@/lib/learningEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getOrCreateLearningProfile();
  return NextResponse.json({
    ...profile,
    layerLabel: LAYER_LABELS[profile.layer] ?? "高校受験",
  });
}
