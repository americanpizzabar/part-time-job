import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateLearningProfile, LAYER_LABELS } from "@/lib/learningEngine";
import { LAYER_GRADE_LABEL } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getOrCreateLearningProfile();
  return NextResponse.json({
    genreCurrent: profile.genreCurrent,
    genreEconomy: profile.genreEconomy,
    genreEnglish: profile.genreEnglish,
    genreLogic: profile.genreLogic,
    levelCap: profile.levelCap,
    layer: profile.layer,
    layerLabel: LAYER_LABELS[profile.layer] ?? "高校受験",
    layerGradeLabel: LAYER_GRADE_LABEL[profile.layer] ?? "高校生レベル",
  });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as {
    genreCurrent?: boolean;
    genreEconomy?: boolean;
    genreEnglish?: boolean;
    genreLogic?: boolean;
    levelCap?: number;
  };

  if (body.levelCap !== undefined && ![0, 1, 2, 3].includes(body.levelCap)) {
    return NextResponse.json({ error: "levelCap must be 0, 1, 2, or 3" }, { status: 400 });
  }

  const profile = await getOrCreateLearningProfile();

  const data: Record<string, boolean | number> = {};
  if (body.genreCurrent !== undefined) data.genreCurrent = body.genreCurrent;
  if (body.genreEconomy !== undefined) data.genreEconomy = body.genreEconomy;
  if (body.genreEnglish !== undefined) data.genreEnglish = body.genreEnglish;
  if (body.genreLogic !== undefined) data.genreLogic = body.genreLogic;
  if (body.levelCap !== undefined) data.levelCap = body.levelCap;

  const updated = await prisma.learningProfile.update({
    where: { id: profile.id },
    data,
  });

  return NextResponse.json({
    genreCurrent: updated.genreCurrent,
    genreEconomy: updated.genreEconomy,
    genreEnglish: updated.genreEnglish,
    genreLogic: updated.genreLogic,
    levelCap: updated.levelCap,
    layer: updated.layer,
    layerLabel: LAYER_LABELS[updated.layer] ?? "高校受験",
    layerGradeLabel: LAYER_GRADE_LABEL[updated.layer] ?? "高校生レベル",
  });
}
