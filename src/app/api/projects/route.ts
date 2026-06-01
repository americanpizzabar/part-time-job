import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectProgress, boostPerContribution } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { contributions: { orderBy: { createdAt: "desc" } } },
  });
  const result = projects.map(p => {
    const pendingBoosts = p.contributions.filter(c => c.type === "SELF" && c.boostStatus === "PENDING");
    return {
      ...p,
      progress: projectProgress(p),
      boostPerStep: boostPerContribution(p.plannedAmount, p.selfTarget, p.parentBoostTotal),
      pendingBoostCount: pendingBoosts.length,
      remainingParentBoost: Math.max(0, p.parentBoostTotal - p.boostReleased),
    };
  });
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, targetAmount, selfTarget, parentBoostTotal, plannedAmount, imageUrl } = body;

  if (!name?.trim() || !targetAmount) {
    return NextResponse.json({ error: "プロジェクト名と目標額が必要です" }, { status: 400 });
  }
  const target = Number(targetAmount);
  const self = Number(selfTarget ?? 0);
  const boost = Number(parentBoostTotal ?? 0);
  if (self + boost !== target) {
    return NextResponse.json(
      { error: "自己原資 + 親ブーストが目標総額と一致している必要があります" },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      targetAmount: target,
      selfTarget: self,
      parentBoostTotal: boost,
      plannedAmount: Number(plannedAmount ?? 0),
      imageUrl: imageUrl ?? null,
      status: "PENDING",
    },
  });
  return NextResponse.json(project, { status: 201 });
}
