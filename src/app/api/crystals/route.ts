import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const cubes = await prisma.memoryCube.findMany({ orderBy: { crystallizedAt: "asc" } });
  return NextResponse.json(cubes);
}

export async function PATCH(req: Request) {
  const { id, nickname } = await req.json() as { id: number; nickname: string };
  const updated = await prisma.memoryCube.update({ where: { id }, data: { nickname } });
  return NextResponse.json(updated);
}
