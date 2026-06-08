import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, targetAmount, deadline, imageUrl, isAchieved } = body;

  const goal = await prisma.savingsGoal.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(targetAmount !== undefined && { targetAmount: Number(targetAmount) }),
      ...(deadline !== undefined && { deadline }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(isAchieved !== undefined && {
        isAchieved,
        achievedAt: isAchieved ? new Date() : null,
      }),
    },
  });
  return NextResponse.json(goal);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.savingsGoal.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
