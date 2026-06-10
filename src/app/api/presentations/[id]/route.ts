import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/requireParent";
import { today } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const presentationId = Number(id);
  const body = await req.json();
  const { status, parentMessage, itemName, reason, totalAmount, selfAmount, requestAmount, imageUrl } = body;

  // status 変更(承認/却下)と parentMessage は親専用操作
  if (status !== undefined || parentMessage !== undefined) {
    const deny = await requireParent();
    if (deny) return deny;
  }

  const existing = await prisma.presentationRequest.findUnique({ where: { id: presentationId } });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated = await prisma.presentationRequest.update({
    where: { id: presentationId },
    data: {
      ...(status !== undefined && {
        status,
        respondedAt: status !== "PENDING" ? new Date() : null,
      }),
      ...(parentMessage !== undefined && { parentMessage }),
      ...(itemName !== undefined && { itemName }),
      ...(reason !== undefined && { reason }),
      ...(totalAmount !== undefined && { totalAmount: Number(totalAmount) }),
      ...(selfAmount !== undefined && { selfAmount: Number(selfAmount) }),
      ...(requestAmount !== undefined && { requestAmount: Number(requestAmount) }),
      ...(imageUrl !== undefined && { imageUrl }),
    },
  });

  // 承認 → 補助額を収入として自動計上 / 承認解除 → 取り消し
  if (status !== undefined) {
    const linked = await prisma.transaction.findUnique({
      where: { presentationId },
    });
    if (status === "APPROVED" && !linked) {
      await prisma.transaction.create({
        data: {
          type: "INCOME",
          amount: updated.requestAmount,
          date: today(),
          memo: `おねだり承認: ${updated.itemName}`,
          source: "PRESENTATION",
          presentationId,
        },
      });
    } else if (status !== "APPROVED" && linked) {
      await prisma.transaction.delete({ where: { id: linked.id } });
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const presentationId = Number(id);
  const linked = await prisma.transaction.findUnique({ where: { presentationId } });
  if (linked) {
    await prisma.transaction.delete({ where: { id: linked.id } });
  }
  await prisma.presentationRequest.delete({ where: { id: presentationId } });
  return NextResponse.json({ ok: true });
}
