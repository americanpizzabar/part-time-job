import { NextResponse } from "next/server";
import { prisma, resolveFamilyId, resolveActiveChildId } from "@/lib/prisma";
import { today } from "@/lib/dateUtils";
import { getOptisState, parseUnlocked, computeDarkRep } from "@/lib/optisServer";
import {
  generateBlackDeal, blackDealInspectCost, getPart,
  BLACKDEAL_MIN_REP, BLACKDEAL_SCAM_CONSOLATION, BLACKDEAL_JACKPOT_RATE,
} from "@/lib/optis";

export const dynamic = "force-dynamic";

// 本日の闇取引を(無ければ決定論シードから生成して)取得する。
async function getOrCreateDeal() {
  const date = today();
  let deal = await prisma.blackDeal.findFirst({ where: { date } });
  if (!deal) {
    const [familyId, childId] = await Promise.all([resolveFamilyId(), resolveActiveChildId()]);
    const spec = generateBlackDeal(`${familyId}:${childId}:${date}`);
    deal = await prisma.blackDeal.create({
      data: { date, partId: spec.partId, price: spec.price, basePrice: spec.basePrice, legit: spec.legit },
    }).catch(async () => (await prisma.blackDeal.findFirst({ where: { date } }))!); // 同時アクセス時
  }
  return deal;
}

// 取引のクライアント向けビュー。真贋(legit)は鑑定済み or 決着済みのときだけ開示する。
function dealView(deal: NonNullable<Awaited<ReturnType<typeof getOrCreateDeal>>>, rankIdx: number, gcoins: number) {
  const part = getPart(deal.partId);
  const inspectCost = blackDealInspectCost(deal.price, rankIdx);
  return {
    date: deal.date,
    part: part ? { id: part.id, name: part.name, emoji: part.emoji ?? "✨", rarity: part.rarity } : null,
    price: deal.price,
    basePrice: deal.basePrice,
    discountPct: Math.round((1 - deal.price / deal.basePrice) * 100),
    inspected: deal.inspected,
    legit: deal.inspected || deal.outcome ? deal.legit : null,
    outcome: deal.outcome,
    inspectCost,
    gcoins,
  };
}

export async function GET() {
  const rep = await computeDarkRep();
  if (rep.rep < BLACKDEAL_MIN_REP) {
    return NextResponse.json({
      locked: true, rep: rep.rep, minRep: BLACKDEAL_MIN_REP, rank: rep.rank,
    });
  }
  const state = await getOptisState();
  const deal = await getOrCreateDeal();
  return NextResponse.json({ locked: false, rep: rep.rep, rank: rep.rank, deal: dealView(deal, rep.rank.idx, state.gcoins) });
}

export async function POST(req: Request) {
  const rep = await computeDarkRep();
  if (rep.rep < BLACKDEAL_MIN_REP) {
    return NextResponse.json({ error: `REP ${BLACKDEAL_MIN_REP} 以上でディーラーはあんたと取引する` }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body as { action: "inspect" | "buy" };
  const state = await getOptisState();
  const deal = await getOrCreateDeal();

  if (deal.outcome) {
    return NextResponse.json({ error: "本日の取引はすでに決着済みだ。また明日来な。" }, { status: 400 });
  }

  if (action === "inspect") {
    if (deal.inspected) {
      return NextResponse.json({ error: "すでに鑑定済みだ" }, { status: 400 });
    }
    const cost = blackDealInspectCost(deal.price, rep.rank.idx);
    if (state.gcoins < cost) {
      return NextResponse.json({ error: `鑑定料が足りない (必要 ${cost}G)` }, { status: 400 });
    }
    await prisma.optisState.update({ where: { id: state.id }, data: { gcoins: state.gcoins - cost } });
    const updated = await prisma.blackDeal.update({ where: { id: deal.id }, data: { inspected: true } });
    return NextResponse.json({
      ok: true,
      legit: updated.legit,
      gcoins: state.gcoins - cost,
      message: updated.legit
        ? "鑑定結果: 真正品だ。この値段なら破格──買いだ。"
        : "鑑定結果: 粗悪品(スキャム)だ。危なかったな。鑑定料は保険だと思え。",
    });
  }

  if (action === "buy") {
    if (state.gcoins < deal.price) {
      return NextResponse.json({ error: `Gコインが足りない (必要 ${deal.price}G)` }, { status: 400 });
    }

    if (!deal.legit) {
      // 粗悪品: 支払いは戻らない。慰謝料として生データを少し掴ませる。
      await prisma.optisState.update({
        where: { id: state.id },
        data: { gcoins: state.gcoins - deal.price, rawData: state.rawData + BLACKDEAL_SCAM_CONSOLATION },
      });
      await prisma.blackDeal.update({ where: { id: deal.id }, data: { outcome: "SCAMMED" } });
      return NextResponse.json({
        ok: true, outcome: "SCAMMED",
        rawDataGained: BLACKDEAL_SCAM_CONSOLATION,
        gcoins: state.gcoins - deal.price,
        lesson: "……粗悪品を掴まされた。安すぎる話には裏がある。次からは鑑定料をケチるな。それが「情報にカネを払う」ということだ。",
      });
    }

    const unlocked = parseUnlocked(state.unlockedParts);
    const part = getPart(deal.partId);
    const alreadyOwned = unlocked.includes(deal.partId);
    const jackpot = alreadyOwned ? Math.round((deal.price * BLACKDEAL_JACKPOT_RATE) / 5) * 5 : 0;

    await prisma.optisState.update({
      where: { id: state.id },
      data: {
        gcoins: state.gcoins - deal.price + jackpot,
        ...(alreadyOwned ? {} : { unlockedParts: JSON.stringify([...unlocked, deal.partId]) }),
      },
    });
    const outcome = alreadyOwned ? "WIN_JACKPOT" : "WIN_PART";
    await prisma.blackDeal.update({ where: { id: deal.id }, data: { outcome } });
    await prisma.rewardLog.create({
      data: {
        source: "BLACKDEAL",
        rarity: part?.rarity ?? "RARE",
        rewardId: deal.partId,
        label: alreadyOwned
          ? `闇取引: 転売益 +${jackpot}G`
          : `闇取引: ${part?.emoji ?? "✨"} ${part?.name ?? deal.partId} を格安入手`,
        date: deal.date,
      },
    });
    return NextResponse.json({
      ok: true, outcome,
      part: part ? { id: part.id, name: part.name, emoji: part.emoji ?? "✨", rarity: part.rarity } : null,
      jackpot,
      gcoins: state.gcoins - deal.price + jackpot,
      lesson: alreadyOwned
        ? `真正品だが所持済みのため、ディーラーが即座に買い戻した。転売益 +${jackpot}G。相場を知る者が勝つ。`
        : "真正品だ。相場より安く仕入れる──これが「情報の非対称性」を制した者の報酬だ。",
    });
  }

  return NextResponse.json({ error: "不正なアクションだ" }, { status: 400 });
}
