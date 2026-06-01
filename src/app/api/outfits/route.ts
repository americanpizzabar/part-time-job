import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const outfits = await prisma.outfitSet.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(outfits);
}

export async function POST(req: Request) {
  const { name, equippedBody, equippedAura, equippedAccessory } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "名前が必要です" }, { status: 400 });
  const outfit = await prisma.outfitSet.create({
    data: { name: name.trim(), equippedBody, equippedAura, equippedAccessory: equippedAccessory ?? null },
  });
  return NextResponse.json(outfit, { status: 201 });
}
