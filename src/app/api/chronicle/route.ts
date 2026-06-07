import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface TimelineEntry {
  kind: "REBIRTH" | "MISSION" | "PROJECT" | "BIG_BUY" | "PRESENTATION";
  date: string;
  title: string;
  detail: string;
  icon: string;
}

// 日付を比較用にエポックミリ秒へ。"YYYY-MM-DD" でもDateでも受け付ける。
function toTime(d: string | Date | null | undefined): number {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function toIso(d: string | Date | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d; // "YYYY-MM-DD" はそのまま保持
  return d.toISOString();
}

export async function GET() {
  const [cubes, missions, projects, bigBuys, presentations, optis] = await Promise.all([
    prisma.memoryCube.findMany(),
    prisma.mission.findMany({ where: { status: { in: ["APPROVED", "CLEARED"] } } }),
    prisma.project.findMany({ where: { status: "COMPLETED" } }),
    prisma.transaction.findMany({ where: { type: "EXPENSE", amount: { gte: 3000 } } }),
    prisma.presentationRequest.findMany({ where: { status: "APPROVED" } }),
    prisma.optisState.aggregate({ _max: { generation: true } }),
  ]);

  const timeline: TimelineEntry[] = [];

  for (const c of cubes) {
    timeline.push({
      kind: "REBIRTH",
      date: toIso(c.crystallizedAt),
      title: `第${c.generation}世代へ転生`,
      detail: `${c.form} / Stage${c.stage} / Lv${c.level}`,
      icon: "🔮",
    });
  }

  for (const m of missions) {
    timeline.push({
      kind: "MISSION",
      date: toIso(m.clearedAt ?? m.approvedAt ?? m.createdAt),
      title: m.title,
      detail: m.description ?? "",
      icon: "🎖️",
    });
  }

  for (const p of projects) {
    timeline.push({
      kind: "PROJECT",
      date: toIso(p.completedAt ?? p.createdAt),
      title: p.name,
      detail: `目標 ¥${p.targetAmount}`,
      icon: "🏆",
    });
  }

  for (const t of bigBuys) {
    const needs = t.needsWants === "NEEDS";
    timeline.push({
      kind: "BIG_BUY",
      date: t.date, // "YYYY-MM-DD" のまま
      title: `¥${t.amount}の${needs ? "自己投資" : "買い物"}`,
      detail: t.memo ?? t.category ?? "",
      icon: needs ? "📘" : "🛍️",
    });
  }

  for (const pr of presentations) {
    timeline.push({
      kind: "PRESENTATION",
      date: toIso(pr.respondedAt ?? pr.createdAt),
      title: `おねだり達成: ${pr.itemName}`,
      detail: `¥${pr.totalAmount}`,
      icon: "🙏",
    });
  }

  timeline.sort((a, b) => toTime(b.date) - toTime(a.date));

  return NextResponse.json({
    timeline,
    stats: {
      generations: optis._max.generation ?? 1,
      cubes: cubes.length,
      missionsCleared: missions.length,
      projectsCompleted: projects.length,
    },
  });
}
