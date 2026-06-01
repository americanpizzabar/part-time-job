import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 親管理用: 全キーワードを日付昇順で返す(ポイント付与なし)
export async function GET() {
  const keywords = await prisma.dailyKeyword.findMany({
    orderBy: [{ date: "asc" }, { id: "asc" }],
    select: { id: true, word: true, english: true, emoji: true, gradient: true, date: true },
  });
  return NextResponse.json(keywords);
}
