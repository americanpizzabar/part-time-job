import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const category = searchParams.get("category");

  const where = {
    ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {}),
    ...(category ? { category } : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { type, amount, category, needsWants, date, memo, isPrivate, imageUrl } = body;

  if (!type || amount === undefined || !date) {
    return NextResponse.json({ error: "type, amount, date are required" }, { status: 400 });
  }
  if (type === "EXPENSE" && !needsWants) {
    return NextResponse.json({ error: "needsWants is required for expense" }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      type,
      amount: Number(amount),
      category: type === "EXPENSE" ? category ?? null : null,
      needsWants: type === "EXPENSE" ? needsWants ?? null : null,
      date,
      memo: memo ?? null,
      imageUrl: type === "EXPENSE" ? imageUrl ?? null : null,
      isPrivate: Boolean(isPrivate),
      source: "MANUAL",
    },
  });
  return NextResponse.json(transaction, { status: 201 });
}
