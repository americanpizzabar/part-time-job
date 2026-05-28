import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const presentations = await prisma.presentationRequest.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(presentations);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { itemName, reason, totalAmount, selfAmount, requestAmount, imageUrl } = body;

  if (!itemName || !reason || totalAmount === undefined || requestAmount === undefined) {
    return NextResponse.json(
      { error: "itemName, reason, totalAmount, requestAmount are required" },
      { status: 400 }
    );
  }

  const presentation = await prisma.presentationRequest.create({
    data: {
      itemName,
      reason,
      totalAmount: Number(totalAmount),
      selfAmount: Number(selfAmount ?? 0),
      requestAmount: Number(requestAmount),
      imageUrl: imageUrl || null,
      status: "PENDING",
    },
  });
  return NextResponse.json(presentation, { status: 201 });
}
