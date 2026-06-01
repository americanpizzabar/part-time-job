import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const missions = await prisma.mission.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(missions);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, description, rewardType, rewardCash, rewardPart } = body;
  if (!title || !rewardType) {
    return NextResponse.json({ error: "title, rewardType is required" }, { status: 400 });
  }
  const mission = await prisma.mission.create({
    data: {
      title,
      description: description ?? null,
      rewardType,
      rewardCash: rewardType === "CASH" ? Number(rewardCash ?? 0) : null,
      rewardPart: rewardType === "PART" ? rewardPart ?? null : null,
      status: "SENT",
    },
  });
  return NextResponse.json(mission, { status: 201 });
}
