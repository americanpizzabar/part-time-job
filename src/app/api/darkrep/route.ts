import { NextResponse } from "next/server";
import { computeDarkRep } from "@/lib/optisServer";
import { BLACKDEAL_MIN_REP } from "@/lib/optis";

export const dynamic = "force-dynamic";

// ハッカーREP(裏社会での名声)の現在値・ランク・内訳を返す。
export async function GET() {
  const rep = await computeDarkRep();
  return NextResponse.json({
    ...rep,
    blackDealUnlocked: rep.rep >= BLACKDEAL_MIN_REP,
    blackDealMinRep: BLACKDEAL_MIN_REP,
  });
}
