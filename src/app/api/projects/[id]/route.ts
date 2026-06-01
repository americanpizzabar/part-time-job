import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";
import { boostPerContribution } from "@/lib/optis";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id: Number(id) },
    include: { contributions: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(project);
}

// action: APPROVE | REJECT | CONTRIBUTE | BOOST
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pid = Number(id);
  const body = await req.json();
  const action: string = body.action;

  const project = await prisma.project.findUnique({ where: { id: pid } });
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  // --- 親: 承認 / 却下 ---
  if (action === "APPROVE") {
    const updated = await prisma.project.update({
      where: { id: pid },
      data: { status: "ACTIVE", approvedAt: new Date(), parentMessage: body.message ?? null },
    });
    return NextResponse.json(updated);
  }
  if (action === "REJECT") {
    const updated = await prisma.project.update({
      where: { id: pid },
      data: { status: "REJECTED", parentMessage: body.message ?? null },
    });
    return NextResponse.json(updated);
  }

  // --- 子: 計画的積立(プールに回す) ---
  if (action === "CONTRIBUTE") {
    if (project.status !== "ACTIVE") {
      return NextResponse.json({ error: "進行中のプロジェクトではありません" }, { status: 400 });
    }
    const amount = Number(body.amount ?? project.plannedAmount);
    if (amount <= 0) return NextResponse.json({ error: "金額が不正です" }, { status: 400 });

    // 親ブーストの余地があればブースト待ちにする
    const boostable = project.boostReleased < project.parentBoostTotal;
    await prisma.projectContribution.create({
      data: {
        projectId: pid,
        amount,
        type: "SELF",
        boostStatus: boostable ? "PENDING" : null,
        date: today(),
      },
    });
    const newSelf = project.selfSaved + amount;
    const completed = newSelf + project.boostReleased >= project.targetAmount;
    const updated = await prisma.project.update({
      where: { id: pid },
      data: {
        selfSaved: newSelf,
        ...(completed ? { status: "COMPLETED", completedAt: new Date() } : {}),
      },
    });
    return NextResponse.json({ ...updated, justCompleted: completed });
  }

  // --- 親: ブースト実行(連動型出資) ---
  if (action === "BOOST") {
    if (project.status !== "ACTIVE") {
      return NextResponse.json({ error: "進行中のプロジェクトではありません" }, { status: 400 });
    }
    const pending = await prisma.projectContribution.findFirst({
      where: { projectId: pid, type: "SELF", boostStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    if (!pending) {
      return NextResponse.json({ error: "ブースト待ちの積立がありません" }, { status: 400 });
    }
    const step = boostPerContribution(project.plannedAmount, project.selfTarget, project.parentBoostTotal);
    const remaining = Math.max(0, project.parentBoostTotal - project.boostReleased);
    const boostAmount = Math.min(step, remaining);
    if (boostAmount <= 0) {
      await prisma.projectContribution.update({ where: { id: pending.id }, data: { boostStatus: "RELEASED" } });
      return NextResponse.json({ error: "親ブーストの残額がありません" }, { status: 400 });
    }

    await prisma.projectContribution.create({
      data: { projectId: pid, amount: boostAmount, type: "BOOST", date: today() },
    });
    await prisma.projectContribution.update({ where: { id: pending.id }, data: { boostStatus: "RELEASED" } });

    const newBoost = project.boostReleased + boostAmount;
    const completed = project.selfSaved + newBoost >= project.targetAmount;
    const updated = await prisma.project.update({
      where: { id: pid },
      data: {
        boostReleased: newBoost,
        ...(completed ? { status: "COMPLETED", completedAt: new Date() } : {}),
      },
    });
    return NextResponse.json({ ...updated, boostAmount, justCompleted: completed });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.project.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
