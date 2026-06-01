import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEED: { word: string; translation: string; choices: string[]; correctIndex: number; hint: string; expReward: number }[] = [
  { word:"Budget", translation:"予算", choices:["Budget","Target","Balance"], correctIndex:0, hint:"ダークウェブの ◯◯◯◯◯ を管理せよ。暗号を解け。", expReward:30 },
  { word:"Invest", translation:"投資", choices:["Spend","Invest","Borrow"], correctIndex:1, hint:"将来の利益のために資金を ◯◯◯◯◯ するのが賢者の選択だ。", expReward:30 },
  { word:"Asset", translation:"資産", choices:["Asset","Expense","Liability"], correctIndex:0, hint:"価値を生み出すものを ◯◯◯◯◯ と呼ぶ。負債との違いを理解せよ。", expReward:30 },
  { word:"Income", translation:"収入", choices:["Outcome","Income","Output"], correctIndex:1, hint:"労働や投資から得られる ◯◯◯◯◯ を最大化せよ。", expReward:30 },
  { word:"Inflation", translation:"インフレ", choices:["Deflation","Stagnation","Inflation"], correctIndex:2, hint:"物価上昇が続く時代に貯金だけでは負ける。", expReward:40 },
  { word:"Dividend", translation:"配当", choices:["Dividend","Principal","Penalty"], correctIndex:0, hint:"株を持つだけで得られる ◯◯◯◯◯◯◯◯ — 眠っている間も稼ぐ仕組み。", expReward:40 },
  { word:"Portfolio", translation:"ポートフォリオ", choices:["Position","Portfolio","Prospect"], correctIndex:1, hint:"複数の資産を組み合わせてリスクを分散する。", expReward:50 },
  { word:"Interest", translation:"利子", choices:["Interest","Discount","Principal"], correctIndex:0, hint:"借りたお金に上乗せされる ◯◯◯◯◯◯◯◯ — 借りる側は損、貸す側は得。", expReward:30 },
  { word:"Revenue", translation:"収益", choices:["Revenue","Expense","Profit"], correctIndex:0, hint:"事業から得られる総売上。コストを引くと利益になる。", expReward:35 },
  { word:"Compound", translation:"複利", choices:["Simple","Compound","Linear"], correctIndex:1, hint:"元本だけでなく利益にも利子がつく ◯◯◯◯◯◯◯◯ 効果は最強の武器だ。", expReward:50 },
];

export async function GET() {
  const count = await prisma.wordMission.count();
  if (count === 0) {
    await prisma.wordMission.createMany({ data: SEED });
  }
  const missions = await prisma.wordMission.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(missions);
}
