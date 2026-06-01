import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const loans = await prisma.familyLoan.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(loans);
}

export async function POST(req: Request) {
  const { purpose, principal, months } = await req.json() as {
    purpose: string;
    principal: number;
    months: number;
  };
  if (!purpose?.trim() || !principal || !months) {
    return NextResponse.json({ error: "purpose, principal, months は必須です" }, { status: 400 });
  }
  if (months < 1 || months > 12) {
    return NextResponse.json({ error: "返済期間は1〜12ヶ月です" }, { status: 400 });
  }

  // 既に申請中や返済中のローンがあれば重複チェック
  const active = await prisma.familyLoan.findFirst({ where: { status: { in: ["PENDING", "ACTIVE"] } } });
  if (active) {
    return NextResponse.json({ error: "現在進行中のローンがあります" }, { status: 409 });
  }

  const monthlyPayment = Math.ceil(principal / months); // 利息は親が後で設定
  const loan = await prisma.familyLoan.create({
    data: { purpose: purpose.trim(), principal, months, monthlyPayment },
  });
  return NextResponse.json(loan, { status: 201 });
}
