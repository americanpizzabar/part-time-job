import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/requireParent";
import { today } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

// お年玉・お祝い金の残高と履歴を返す(子は閲覧のみ)。
export async function GET() {
  const entries = await prisma.giftMoney.findMany({ orderBy: { date: "desc" } });
  const balance = entries.reduce((s, e) => s + e.amount, 0);
  return NextResponse.json({ balance, entries });
}

// 親が入金(お年玉等)を記録、または引き出し/調整を記録する。
// amount > 0 = 入金、amount < 0 = 引き出し/減額(残高はマイナスにできない)。
export async function POST(req: Request) {
  const deny = await requireParent();
  if (deny) return deny;

  const body = await req.json();
  const { amount, label, fromWhom, note, date } = body as {
    amount: number; label?: string; fromWhom?: string; note?: string; date?: string;
  };
  const amt = Number(amount);
  if (!amt || Number.isNaN(amt)) {
    return NextResponse.json({ error: "金額を入力してください" }, { status: 400 });
  }

  // 引き出し(マイナス)時は残高を超えないことを確認
  if (amt < 0) {
    const entries = await prisma.giftMoney.findMany();
    const balance = entries.reduce((s, e) => s + e.amount, 0);
    if (balance + amt < 0) {
      return NextResponse.json({ error: "残高が足りません", balance }, { status: 400 });
    }
  }

  const entry = await prisma.giftMoney.create({
    data: {
      amount: amt,
      label: label?.trim() || (amt >= 0 ? "お祝い金" : "引き出し"),
      fromWhom: fromWhom?.trim() || null,
      note: note?.trim() || null,
      date: date || today(),
    },
  });
  return NextResponse.json(entry, { status: 201 });
}

// 親が誤記録を削除する。
export async function DELETE(req: Request) {
  const deny = await requireParent();
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id が必要です" }, { status: 400 });
  await prisma.giftMoney.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
