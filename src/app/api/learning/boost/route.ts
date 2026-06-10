import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/requireParent";
import { getOrCreateLearningProfile } from "@/lib/learningEngine";
import { today } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const deny = await requireParent();
  if (deny) return deny;

  const { amount } = await req.json() as { amount: number };
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount required" }, { status: 400 });
  }

  const profile = await getOrCreateLearningProfile();
  // Award as INCOME transaction
  await prisma.transaction.create({
    data: {
      type: "INCOME",
      amount,
      date: today(),
      memo: `知性ブースト投資 (Layer ${profile.layer} 到達ご褒美)`,
      source: "BOOST",
    },
  });

  await prisma.learningProfile.update({
    where: { id: profile.id },
    data: { parentBoosted: true },
  });

  return NextResponse.json({ ok: true });
}
