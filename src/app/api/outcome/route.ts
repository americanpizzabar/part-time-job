import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const reports = await prisma.outcomeReport.findMany({ orderBy: { createdAt: "desc" } });
  const projectIds = [...new Set(reports.map(r => r.projectId))];
  const projects = await prisma.project.findMany({ where: { id: { in: projectIds } } });
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  return NextResponse.json(reports.map(r => ({
    ...r,
    rewardPartId: r.rewardPart,
    photoUrl: r.imageUrl,
    project: projectMap[r.projectId] ? { name: projectMap[r.projectId].name } : { name: "不明" },
  })));
}

export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, content, metric } = body;
  const imageUrl = body.imageUrl ?? body.photoUrl ?? null;
  if (!projectId || !content?.trim()) {
    return NextResponse.json({ error: "プロジェクトIDと内容が必要です" }, { status: 400 });
  }
  const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
  if (!project || project.status !== "COMPLETED") {
    return NextResponse.json({ error: "達成済みプロジェクトのみ報告できます" }, { status: 400 });
  }
  const existing = await prisma.outcomeReport.findFirst({ where: { projectId: Number(projectId) } });
  if (existing) return NextResponse.json({ error: "すでに報告済みです" }, { status: 409 });

  // レアリティに応じた報酬パーツを事前決定(承認時に解放)
  const { PARTS } = await import("@/lib/optis");
  const { getOptisState, parseUnlocked } = await import("@/lib/optisServer");
  const state = await getOptisState();
  const unlocked = parseUnlocked(state.unlockedParts);
  const candidates = PARTS.filter(p =>
    (p.rarity === "RARE" || p.rarity === "LEGENDARY") && !unlocked.includes(p.id)
  );
  const rewardPart = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)].id
    : null;

  const report = await prisma.outcomeReport.create({
    data: { projectId: Number(projectId), content: content.trim(), imageUrl: imageUrl ?? null, metric: metric ?? null, rewardPart },
  });
  return NextResponse.json(report, { status: 201 });
}
