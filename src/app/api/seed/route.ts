import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  const existingChores = await prisma.chore.count();
  if (existingChores > 0) {
    return NextResponse.json({ message: "Already seeded" });
  }

  await prisma.chore.createMany({
    data: [
      { name: "お皿洗い", amount: 50, description: "食後の食器を洗う" },
      { name: "部屋の掃除", amount: 100, description: "自分の部屋を掃除する" },
      { name: "ゴミ出し", amount: 50, description: "ゴミをまとめて出す" },
      { name: "洗濯物たたみ", amount: 50, description: "洗濯物をたたんで収納する" },
      { name: "風呂掃除", amount: 100, description: "お風呂を掃除する" },
      { name: "買い物お手伝い", amount: 150, description: "スーパーへの買い物を手伝う" },
    ],
  });

  const chores = await prisma.chore.findMany();

  await prisma.choreSchedule.createMany({
    data: [
      { choreId: chores[0].id, scheduleType: "DAILY" },
      {
        choreId: chores[1].id,
        scheduleType: "WEEKLY",
        daysOfWeek: JSON.stringify([6]),
      },
      {
        choreId: chores[2].id,
        scheduleType: "WEEKLY",
        daysOfWeek: JSON.stringify([2, 5]),
      },
      {
        choreId: chores[3].id,
        scheduleType: "WEEKLY",
        daysOfWeek: JSON.stringify([0, 3]),
      },
      {
        choreId: chores[4].id,
        scheduleType: "WEEKLY",
        daysOfWeek: JSON.stringify([5]),
      },
    ],
  });

  await prisma.aggregationConfig.create({
    data: { periodDays: 7, startDayOfWeek: 1 },
  });

  await prisma.allowanceConfig.create({
    data: {
      period: "WEEKLY",
      amount: 500,
      startDate: new Date().toISOString().split("T")[0],
    },
  });

  return NextResponse.json({ message: "Seeded successfully" });
}
