export type CareerSnapshot = {
  stemTotal: number;
  artTotal: number;
  healthTotal: number;
  totalNeeds: number;
  assetCategory: string | null;
};

const STEM_LINES = [
  "STEM投資が積み上がっている。データサイエンティストへの道が開きつつある。",
  "理系スキルへの投資額が上位層に近づいた。未来のエンジニアの卵だ。",
  "プログラミング・技術系への支出継続中。ITスタートアップ創業者の平均学習パターンに一致。",
  "STEM領域への集中投資を検出。AI時代に最も需要が高い人材になるルートだ。",
];
const ART_LINES = [
  "感性・文化への投資が際立つ。クリエイター市場で差別化できる強みになる。",
  "ART&CULTURE投資が蓄積中。0→1を生み出すクリエイターの資質が育っている。",
  "感性への投資は、AIが最も苦手とする領域だ。今の積み重ねが10年後の強みになる。",
  "文化的投資の継続を検出。プロデューサーやディレクターに必要な「引き出し」が増えている。",
];
const HEALTH_LINES = [
  "健康・社会スキルへの投資を検出。リーダー職に就く人の共通パターンだ。",
  "ソーシャルスキル投資が蓄積中。チームを率いるマネジャーへの最短ルートの一つ。",
  "心身・人間関係への投資継続中。高パフォーマンスを維持するプロの必須習慣だ。",
  "HEALTH投資が積み上がっている。長期戦を戦い抜く「土台」が強化されている。",
];
const BALANCED_LINES = [
  "STEM・ART・HEALTHをバランスよく投資中。多面的な強みを持つゼネラリストの資質だ。",
  "複数領域への投資を検出。T字型人材(専門×広さ)への道を歩んでいる。",
];
const GENERIC_NEEDS = [
  "自己投資の継続を検出。複利効果は知識にも働く。",
  "今日の学びが5年後の収入を決める。記録継続中。",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function generateCareerFeedback(snap: CareerSnapshot): string {
  const seed = Math.floor(snap.totalNeeds / 500) + (snap.stemTotal + snap.artTotal + snap.healthTotal);
  if (snap.assetCategory === "STEM" && snap.stemTotal > 0) return pick(STEM_LINES, seed);
  if (snap.assetCategory === "ART_CULTURE" && snap.artTotal > 0) return pick(ART_LINES, seed);
  if (snap.assetCategory === "HEALTH_SOCIAL" && snap.healthTotal > 0) return pick(HEALTH_LINES, seed);
  // Check if multiple categories are significant
  const cats = [snap.stemTotal > 0, snap.artTotal > 0, snap.healthTotal > 0].filter(Boolean).length;
  if (cats >= 2) return pick(BALANCED_LINES, seed);
  return pick(GENERIC_NEEDS, seed);
}
