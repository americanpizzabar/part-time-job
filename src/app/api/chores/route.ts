import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/requireParent";

export const dynamic = "force-dynamic";

export async function GET() {
  const chores = await prisma.chore.findMany({
    include: { schedules: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(chores);
}

export async function POST(req: Request) {
  const deny = await requireParent();
  if (deny) return deny;

  const body = await req.json();
  const { name, amount, description } = body;

  if (!name || amount === undefined) {
    return NextResponse.json({ error: "name and amount are required" }, { status: 400 });
  }

  const chore = await prisma.chore.create({
    data: { name, amount: Number(amount), description },
    include: { schedules: true },
  });
  return NextResponse.json(chore, { status: 201 });
}
