// 裏モード「データ・デコード」ミッションのシード。
// 高校・大学受験で頻出の「データの読み取り(統計・グラフ)」と
// 「情報I/プログラミング的思考(疑似コード)」を、ハッキングの謎解きとして出題する。
// 1タップで回答し、正解で EXP + G-COIN、初回クリアでバグパーツを解放する。

export interface DecodeSeed {
  kind: "DATA" | "ALGO";
  title: string;
  brief: string;
  dataset?: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  expReward: number;
  gcoinReward: number;
  rewardPartId?: string;
}

export const DECODE_SEED: DecodeSeed[] = [
  // ── DATA: 相関の読み取り ──
  {
    kind: "DATA",
    title: "極秘データ #01 — 相関スキャン",
    brief: "海外シンクタンクから気温とアイス売上の極秘ログを入手した。相関を解析(デコード)せよ。",
    dataset: "気温(℃), アイス売上(個)\n22, 120\n26, 180\n30, 250\n34, 320",
    question: "このデータが示す関係として正しいものは？",
    choices: [
      "気温が上がるとアイス売上も増える(正の相関)",
      "気温が上がるとアイス売上は減る(負の相関)",
      "気温と売上に関係はない",
    ],
    correctIndex: 0,
    explanation: "片方が増えるともう片方も増える関係を「正の相関」と呼ぶ。ただし相関＝因果ではない点に注意。",
    expReward: 40,
    gcoinReward: 15,
    rewardPartId: "acc_terminal",
  },
  {
    kind: "DATA",
    title: "極秘データ #02 — インフレ感応度",
    brief: "来月インフレの影響を最も受ける産業を予測せよ。価格転嫁データを解読しろ。",
    dataset: "産業, 原材料コスト比率\n外食, 65%\nIT・ソフト, 12%\n衣料, 40%",
    question: "インフレ(原材料高騰)の影響を最も受けやすいのは？",
    choices: ["IT・ソフト", "衣料", "外食"],
    correctIndex: 2,
    explanation: "原材料コスト比率が高いほど、仕入れ値上昇が利益を直撃する。外食は比率65%で最も感応度が高い。",
    expReward: 45,
    gcoinReward: 18,
  },
  {
    kind: "DATA",
    title: "極秘データ #03 — 平均のワナ",
    brief: "年収データに異常値(外れ値)が混入している。代表値を正しく選べ。",
    dataset: "メンバーの月収(万円)\n18, 20, 19, 21, 500",
    question: "「ふつうの人の感覚」に近い代表値はどちら？",
    choices: [
      "平均値(約115万円)",
      "中央値(20万円)",
      "どちらも同じ",
    ],
    correctIndex: 1,
    explanation: "極端な外れ値(500)があると平均は大きく釣り上がる。こういう時は中央値の方が実感に近い。",
    expReward: 50,
    gcoinReward: 20,
    rewardPartId: "aura_glitch",
  },

  // ── ALGO: 疑似コード穴埋め / プログラミング的思考 ──
  {
    kind: "ALGO",
    title: "アルゴリズム #01 — 予算プログラムのバグ修正",
    brief: "支出を自動仕分けするプログラムにバグがある。IF文の条件を修復しろ。",
    dataset: "if ( 買うものが ____ ) {\n    貯金しないで今すぐ買う();\n} else {\n    一度立ち止まって考える();\n}",
    question: "ブランクに入れるべき条件は？",
    choices: [
      "NEEDS(本当に必要なもの)",
      "WANTS(ただ欲しいもの)",
      "高いもの",
    ],
    correctIndex: 0,
    explanation: "必要(NEEDS)なものは迷わず確保し、欲しい(WANTS)だけのものは一度立ち止まる。これが賢い分岐ロジックだ。",
    expReward: 45,
    gcoinReward: 18,
    rewardPartId: "acc_bug_wings",
  },
  {
    kind: "ALGO",
    title: "アルゴリズム #02 — 合計ループ",
    brief: "お小遣いの合計を計算するループ。空欄の処理を補完しろ。",
    dataset: "合計 = 0\nfor (今日の収入 in 今週) {\n    ____\n}\n表示する(合計)",
    question: "ブランクに入る処理は？",
    choices: [
      "合計 = 今日の収入",
      "合計 = 合計 + 今日の収入",
      "合計 = 合計 - 今日の収入",
    ],
    correctIndex: 1,
    explanation: "繰り返しの中で「合計に足し込む」のが累積の基本。代入(=)だと毎回上書きされて最後の1件しか残らない。",
    expReward: 45,
    gcoinReward: 18,
  },
  {
    kind: "ALGO",
    title: "アルゴリズム #03 — 論理ゲート",
    brief: "限定ドロップの解放条件。AND/OR を正しく読め。",
    question: "「Lv.10 以上 かつ クイズ正解」で解放。Lv.12でクイズ不正解の時は？",
    choices: ["解放される", "解放されない", "エラーになる"],
    correctIndex: 1,
    explanation: "AND(かつ)は両方の条件が真でないと成立しない。片方(クイズ)が偽なので解放されない。",
    expReward: 50,
    gcoinReward: 20,
  },
];
