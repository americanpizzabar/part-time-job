import { seededInt } from "./optis";
import type { BrainType } from "./optis";

export type MissionType =
  | "MARKET_BUY"
  | "MARKET_SELL"
  | "NMD"
  | "BANK_DEPOSIT"
  | "QUIZ_CORRECT"
  | "SAVINGS_CONTRIBUTE"
  | "DECODE_SOLVE"
  | "FORECAST_BUY"
  | "WORD_SOLVE";

export interface DailyMissionDef {
  type: MissionType;
  title: string;
  desc: string;
  reward: { exp: number; gcoins: number };
  brainTag: BrainType;
}

export const MISSION_POOL: DailyMissionDef[] = [
  {
    type: "MARKET_BUY",
    title: "マーケット仕込み",
    desc: "パーツを1個購入せよ。価格変動を読んで動けるか？",
    reward: { exp: 20, gcoins: 10 },
    brainTag: "IMPULSIVE",
  },
  {
    type: "MARKET_SELL",
    title: "利確チャレンジ",
    desc: "所持パーツを1個売却して利益を確定せよ",
    reward: { exp: 25, gcoins: 15 },
    brainTag: "ANALYTICAL",
  },
  {
    type: "NMD",
    title: "ノーマネーデー",
    desc: "今日は一切消費せずに過ごせるか？",
    reward: { exp: 40, gcoins: 20 },
    brainTag: "FRUGAL",
  },
  {
    type: "BANK_DEPOSIT",
    title: "Gコイン定期預入",
    desc: "バーチャルバンクにGコインを預けよ。週利10%が待っている",
    reward: { exp: 20, gcoins: 10 },
    brainTag: "FRUGAL",
  },
  {
    type: "QUIZ_CORRECT",
    title: "経済クイズ正解",
    desc: "知識クイズに正解して7日間の価格シールドを手に入れろ",
    reward: { exp: 30, gcoins: 15 },
    brainTag: "ANALYTICAL",
  },
  {
    type: "SAVINGS_CONTRIBUTE",
    title: "目標貯金",
    desc: "いずれかの貯金ゴールに積み立てよ",
    reward: { exp: 25, gcoins: 15 },
    brainTag: "FRUGAL",
  },
  {
    type: "DECODE_SOLVE",
    title: "DECODE解読",
    desc: "データ解読ミッションを1つ突破して脳を鍛えろ",
    reward: { exp: 35, gcoins: 20 },
    brainTag: "ANALYTICAL",
  },
  {
    type: "FORECAST_BUY",
    title: "INTEL購入",
    desc: "知性ポイントを使って経済予報を先読みせよ",
    reward: { exp: 20, gcoins: 10 },
    brainTag: "ANALYTICAL",
  },
  {
    type: "WORD_SOLVE",
    title: "英語ミッション",
    desc: "英語ワードミッションを1つ解読せよ。LANG_MODE解放が近づく",
    reward: { exp: 25, gcoins: 10 },
    brainTag: "BALANCED",
  },
];

// 日付シードで3ミッションを決定論的に選択(重複なし)
export function rollDailyMissions(dateStr: string): DailyMissionDef[] {
  const n = MISSION_POOL.length;
  const i0 = seededInt(dateStr + ":m0", n);
  let i1 = seededInt(dateStr + ":m1", n);
  if (i1 === i0) i1 = (i1 + 1) % n;
  let i2 = seededInt(dateStr + ":m2", n);
  if (i2 === i0 || i2 === i1) i2 = (i2 + 2) % n;
  return [MISSION_POOL[i0], MISSION_POOL[i1], MISSION_POOL[i2]];
}
