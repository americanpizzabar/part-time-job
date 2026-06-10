"use client";

import { useState } from "react";

// ─── データ ──────────────────────────────────────────────

interface Section {
  id: string;
  icon: string;
  title: string;
  color: string;
  bg: string;
  border: string;
  items: ManualItem[];
}

interface ManualItem {
  q: string;
  a: string | string[];
  tip?: string;
}

const SECTIONS: Section[] = [
  {
    id: "start",
    icon: "🚀",
    title: "はじめかた",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    items: [
      {
        q: "Optisって何？",
        a: [
          "Optisは、お金の使い方を学びながら育てるデジタルクリーチャーです。",
          "お手伝いをこなし、賢くお金を使うと、Optisが成長してレベルアップします。",
          "ゲームのキャラクターを育てる感覚で、本物のお金の知識が身につきます！",
        ],
        tip: "Optisをタップするといろんなアクションをしてくれるよ！",
      },
      {
        q: "最初に何をすればいい？（初回セットアップ）",
        a: [
          "① 親のスマホでアプリを開き、家族を作成します（最初の1台目が自動で「親」になります）。",
          "② 設定画面で「基本お小遣い」「集計期間」を入力します。",
          "③ 「家族設定」画面でこどもの名前・アバターを登録します。",
          "④ 「端末を追加」ボタンで6桁コードかQRコードを表示し、こどものスマホで読み取ります。",
          "⑤ こどものスマホがペアリングされたら準備完了！",
        ],
        tip: "コードは10分で期限切れになります。手早く入力してね。",
      },
      {
        q: "家族に複数の端末を追加したい",
        a: [
          "親端末は何台でも追加できます。家族設定 → 「親用の端末を追加」でコードを発行してください。",
          "こどもが複数いる場合は、家族設定でこどもを追加し、それぞれ専用コードを発行します。",
          "各こどものデータは完全に独立して管理されます。",
        ],
      },
      {
        q: "端末を失くしてしまった！",
        a: [
          "【こどもの端末を失くした場合】 親の家族設定 → 端末一覧 → 失くした端末の「削除」で無効化できます。その後、新しい端末にこどものコードを発行して再ペアリングします。",
          "【親の端末を1台失くした場合】 もう1台の親端末で同様に操作できます。",
          "【親の端末をすべて失くした場合】 アプリ最初の画面の「リカバリーコードで復元」から16文字のリカバリーコードを入力します。初回セットアップ時に表示されたコードを保管しておいてください。",
        ],
        tip: "リカバリーコードは安全な場所（メモ帳やパスワードマネージャー）に保管しておきましょう！",
      },
    ],
  },
  {
    id: "chores",
    icon: "🧹",
    title: "お手伝い・稼ぐ",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    items: [
      {
        q: "お手伝いで稼ぐ仕組みは？",
        a: [
          "親が「お手伝い設定」でお手伝いの種類・金額・スケジュールを登録します。",
          "こどもは毎日「お手伝い」タブを開いて、完了したお手伝いにチェックを入れます。",
          "チェックした分が集計期間の「お手伝い収入」に加算され、次のお小遣いに反映されます。",
        ],
        tip: "お手伝いをすればするほどお小遣いが増えるよ！",
      },
      {
        q: "スケジュールの種類は？",
        a: [
          "📅 毎日: 月〜日、毎日表示されます。",
          "📅 曜日指定: たとえば「火・木・土」だけ表示されます。",
          "📅 日付指定: ゴミ出し当番など特定の日だけ表示されます。",
          "📅 スケジュールなし: カレンダーに出てこないが親が手動で追加できる臨時タスク。",
        ],
      },
      {
        q: "お小遣いの支払い方法は？",
        a: [
          "メニュー → 「おこづかい集計」で集計期間の一覧が確認できます。",
          "親が「支払済みにする」ボタンを押すと、こどもの残高に自動で収入が加算されます。",
          "集計期間・基本お小遣い額は「設定」で変更できます。",
        ],
      },
    ],
  },
  {
    id: "budget",
    icon: "📒",
    title: "かけいぼ・残高管理",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    items: [
      {
        q: "残高の「財布」「自由に使える」「貯金中」の違いは？",
        a: [
          "💰 財布: 全収入 − 全支出の合計。持っているお金の総額です。",
          "🟢 自由に使える: 財布 − 目標貯金中の金額。今すぐ使えるお金です。",
          "🔵 貯金中: 目標に積み立てているお金の合計。引き出さない限り取り崩せません。",
        ],
        tip: "各数字をタップすると、内訳の明細が見られます！",
      },
      {
        q: "お金の記録はどうやってつけるの？",
        a: [
          "① ホーム右下の「＋」ボタン、またはかけいぼ右上の「記録」ボタンを押します。",
          "② 収入か支出を選び、金額・カテゴリ・日付を入力します。",
          "③ Needs（必要なもの）か Wants（欲しいもの）を選ぶと、バランスが分析されます。",
          "④ 写真を添付することもできます（レシートなど）。",
        ],
      },
      {
        q: "Needs / Wants って何？",
        a: [
          "「Needs（ニーズ）」= 必要なもの。食費・交通費・文房具など生活に必要な支出。",
          "「Wants（ウォンツ）」= 欲しいもの。ゲーム・おやつ・おもちゃなど好みの支出。",
          "バランスよく使えると Optis が成長します！理想は Needs が多めです。",
        ],
        tip: "かけいぼ画面でその月のNeeds/Wantsの割合がグラフで見られます。",
      },
      {
        q: "記録を間違えて消したい",
        a: [
          "かけいぼのカレンダーで日付をタップして詳細を開くと、自分で入力した記録に「✕」ボタンが表示されます。",
          "メルカリ売上の記録は、✕を押すとメルカリの売上履歴と一緒に削除されます。",
          "お小遣い・おねだり・ローンなど自動計上の記録は、元の画面から操作してください。",
        ],
      },
    ],
  },
  {
    id: "goals",
    icon: "🎯",
    title: "目標貯金",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    items: [
      {
        q: "目標貯金の使い方は？",
        a: [
          "① 「目標」タブ → 「＋ 新しい目標」で名前・目標金額・期限を設定します。",
          "② 「積み立てる」ボタンで「自由に使えるお金」から目標口座へ移します。",
          "③ 目標を達成したら「達成済みにする」ボタンを押して完了！",
        ],
        tip: "目標に写真を設定しておくと、何のために貯めているか一目でわかるよ！",
      },
      {
        q: "目標のお金を引き出すことはできる？",
        a: [
          "はい。目標の詳細 → 「引き出す」から金額を入力して財布に戻すことができます。",
          "ただし引き出すと進捗が下がるので、本当に必要なときだけにしましょう！",
        ],
      },
    ],
  },
  {
    id: "request",
    icon: "🙏",
    title: "おねだり",
    color: "text-pink-700",
    bg: "bg-pink-50",
    border: "border-pink-200",
    items: [
      {
        q: "おねだりの仕組みは？",
        a: [
          "「おねだり」タブから親へ購入リクエストを送れます。",
          "商品名・理由・合計金額・自分で出す金額を入力すると、「親にお願いする額」が自動計算されます。",
          "親が承認すると、「親の補助額」が自動的にこどもの収入として記録されます。",
        ],
        tip: "理由をきちんと書くと承認されやすいよ！写真もつけよう。",
      },
      {
        q: "おねだりの状態の見方は？",
        a: [
          "⏳ 申請中: 親の確認待ち。",
          "✅ 承認: 補助額が財布に入りました！",
          "❌ 却下: 理由をもとに再申請できます。",
        ],
      },
    ],
  },
  {
    id: "optis",
    icon: "✨",
    title: "Optisを育てる",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    items: [
      {
        q: "EXPはどうやって増やすの？",
        a: [
          "📝 収支を記録するたびに EXP がもらえます（Needs 入力で多めに！）。",
          "🧹 お手伝いを完了すると EXP がもらえます。",
          "🎰 毎日1回のルーレット（初回記録後に自動で起動）で EXP を獲得できます。",
          "📚 経済クイズに正解すると EXP と知性ポイントがもらえます。",
          "🌙 放課後チェック（21時以降）でノーマネーデーを達成すると翌日のルーレットが確変！",
        ],
      },
      {
        q: "Gコイン(G🪙)と知性ポイント(⚡)って何？",
        a: [
          "Gコイン: ゲーム内通貨です。ダークウェブ（Optis画面を3秒長押し）でパーツを購入できます。",
          "知性ポイント: 毎日の「今日の1ワード」を読むと +5pt、クイズ正解でも増えます。Optisの知性系能力に影響します。",
        ],
      },
      {
        q: "シンクロ率って何？",
        a: [
          "シンクロ率 = クイズの正答率 と 週の予算達成率 の平均スコアです。",
          "きょうだいがいる場合、シンクロ率でランキングを競えます（金額は非公開で率だけ比べます）。",
        ],
        tip: "週予算は設定画面で入力してね。",
      },
      {
        q: "進化・転生って何？",
        a: [
          "Optisはレベルが上がると「ステージ」が上がり、見た目が変化します（フォームチェンジ）。",
          "最高ステージまで育てると「転生」ができます。転生するとメモリーキューブが生成され、Gen.2からは EXP ボーナスが付きます！",
          "転生を重ねるほどどんどん強くなります。",
        ],
      },
      {
        q: "Optisが凍結された！",
        a: [
          "お小遣い受取後に不正（すでに記録した支出を削除して財布を増やす等）が検知されると凍結されます。",
          "凍結中は EXP が止まり、Optisが反応しなくなります。",
          "親に話して設定からリセットできます。正直にお金を管理しよう！",
        ],
      },
    ],
  },
  {
    id: "projects",
    icon: "🏗️",
    title: "マイ・プロジェクト",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    items: [
      {
        q: "プロジェクトとは？",
        a: [
          "クラウドファンディング型の大きな目標達成システムです。",
          "「自分が出す金額」と「親にブーストしてもらう金額」を設定します。",
          "こどもが積み立てるたびに親のブーストが解放されていくしくみです。",
        ],
        tip: "大きな買い物（自転車・楽器など）に向いています。",
      },
      {
        q: "プロジェクトの流れは？",
        a: [
          "① こどもが名前・目標額・自己負担額・親ブースト額を入力して申請します。",
          "② 親が承認するとプロジェクトが開始します。",
          "③ こどもが積み立てるたびに親ブーストが1件ずつ解放されます。",
          "④ 合計が目標額に達したら完成！",
        ],
      },
    ],
  },
  {
    id: "other",
    icon: "💡",
    title: "その他の機能",
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    items: [
      {
        q: "メルカリ売上の記録とは？",
        a: [
          "不用品をメルカリ等で売ったときに売上を記録できます。",
          "売上が累計1,000円を超えると「商人（トレーダー）属性」が解放されます。",
          "ホーム画面 → 「メルカリ売上」ボタン、またはクイック入力から記録できます。",
        ],
      },
      {
        q: "ジュニア・ファンドとは？",
        a: [
          "メニュー → 親ビュー から設定できる、長期投資シミュレーションです。",
          "財布から一部を「投資」すると年利分がシミュレーション上で増えていきます。",
          "親が「親マッチボーナス率」を設定すると、利回りに親ボーナスが乗ります。",
        ],
        tip: "実際のお金の投資ではなく、投資の概念を学ぶためのシミュレーションです。",
      },
      {
        q: "ファミリーローンとは？",
        a: [
          "親からお金を前借りして、毎月のお小遣いから返済する仕組みです。",
          "ホーム → 「ローン申請」ボタンから申請できます。",
          "完済すると信用スコアが大幅にアップします！",
        ],
      },
      {
        q: "経済クイズはどこで受けられる？",
        a: [
          "ホーム画面の「経済クイズ」バナーが毎日表示されます。",
          "支出を記録したタイミングで「エンカウンタークイズ」が出ることもあります。",
          "正解すると EXP・知性ポイントがもらえ、Optisが成長します。",
        ],
      },
      {
        q: "パーツ図鑑・装備とは？",
        a: [
          "クイズやミッションをこなすと「パーツ」（アクセサリーやオーラ）が集まります。",
          "メニュー → 「パーツ図鑑」からパーツを選んで Optis に装備できます。",
          "レアなパーツほど Optis がかっこよくなります！",
        ],
      },
      {
        q: "ポートフォリオとは？",
        a: [
          "メニュー → 「未来へのポートフォリオ」でこれまでの実績データを PDF/CSV で出力できます。",
          "お小遣い管理の記録、クイズ正答率、目標達成状況など、自己投資の証跡がまとまります。",
        ],
      },
    ],
  },
  {
    id: "parent",
    icon: "👪",
    title: "親向けガイド",
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
    items: [
      {
        q: "親ビューでできることは？",
        a: [
          "• こどもの残高・収支グラフの確認",
          "• おねだりの承認・却下",
          "• プロジェクトの承認・ブースト",
          "• ローンの承認",
          "• 家族全員へのボーナス（Gコイン・EXP）一括配布",
          "• きょうだい対抗シンクロバトルの状況確認",
          "• ジュニア・ファンドの設定（親マッチ率・年利）",
        ],
      },
      {
        q: "こどもが複数いる場合は？",
        a: [
          "家族設定でこどものプロファイルを人数分登録します。",
          "親ビュー上部のタブでこどもを切り替えて、それぞれのデータを確認できます。",
          "各こどものデータは完全に独立しています（兄弟間で金額は見えません）。",
        ],
      },
      {
        q: "お小遣いの払い忘れを防ぐには？",
        a: [
          "メニュー → 「おこづかい集計」で未払いの集計期間が一覧表示されます。",
          "集計期間が終わったら「支払済みにする」を押すことで残高に反映されます。",
          "忘れないように決まった曜日（たとえば毎週日曜日）に確認する習慣をつけましょう。",
        ],
        tip: "集計期間を「週次」にすると管理しやすいです。",
      },
      {
        q: "経済ウェザーって何？",
        a: [
          "「経済ウェザー」は Optis の世界で起きる特殊イベントです。",
          "親ビュー → 経済ウェザー設定 で「好景気」「不景気」などを設定できます。",
          "ウェザーが「好景気」のときは EXP が多くもらえます。",
        ],
      },
    ],
  },
  {
    id: "faq",
    icon: "❓",
    title: "よくある質問",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    items: [
      {
        q: "アプリの通貨（Gコイン）は実際のお金に換金できる？",
        a: "できません。Gコインはアプリ内のゲーム通貨です。実際のお金（円）とは完全に別物です。",
      },
      {
        q: "データはどこに保存される？",
        a: "Neon（PostgreSQL）というクラウドデータベースに安全に保存されます。端末を変えてもデータは消えません。",
      },
      {
        q: "オフラインでも使える？",
        a: "いいえ、データの読み書きにはインターネット接続が必要です。",
      },
      {
        q: "きょうだいに自分のデータは見えてしまう？",
        a: "残高・収支の金額はきょうだいには見えません。「シンクロバトル」では率（%）だけが表示される仕様です。",
      },
      {
        q: "家族を解散したい・リセットしたい",
        a: "現在はアプリ内にリセット機能はありません。管理者（Neonダッシュボード）へご連絡ください。",
      },
    ],
  },
];

// ─── コンポーネント ──────────────────────────────────────

function AccordionItem({ item }: { item: ManualItem }) {
  const [open, setOpen] = useState(false);
  const answers = Array.isArray(item.a) ? item.a : [item.a];

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full text-left flex items-start gap-2 py-3 pr-2"
        onClick={() => setOpen(v => !v)}
      >
        <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold transition-colors
          ${open ? "bg-gray-700 border-gray-700 text-white" : "border-gray-300 text-gray-400"}`}>
          {open ? "−" : "＋"}
        </span>
        <span className="text-sm font-medium text-gray-800 leading-snug">{item.q}</span>
      </button>

      {open && (
        <div className="pb-3 pl-7 space-y-1.5">
          {answers.map((line, i) => (
            <p key={i} className="text-sm text-gray-600 leading-relaxed">{line}</p>
          ))}
          {item.tip && (
            <div className="mt-2 flex items-start gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <span className="text-base flex-shrink-0">💡</span>
              <p className="text-xs text-yellow-800">{item.tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-2xl border ${section.border} overflow-hidden`}>
      <button
        className={`w-full flex items-center gap-3 p-4 ${section.bg} text-left`}
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-2xl">{section.icon}</span>
        <span className={`flex-1 font-bold text-base ${section.color}`}>{section.title}</span>
        <span className={`text-xs text-gray-400 mr-1`}>{section.items.length}項目</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="bg-white px-4 divide-y divide-gray-50">
          {section.items.map((item, i) => (
            <AccordionItem key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ページ ──────────────────────────────────────────────

export default function ManualPage() {
  const [search, setSearch] = useState("");

  const filtered = search.trim().length >= 2
    ? SECTIONS.map(sec => ({
        ...sec,
        items: sec.items.filter(item => {
          const q = item.q + (Array.isArray(item.a) ? item.a.join("") : item.a) + (item.tip ?? "");
          return q.includes(search);
        }),
      })).filter(sec => sec.items.length > 0)
    : SECTIONS;

  return (
    <div className="space-y-5 pb-4">
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📖</span>
          <h1 className="text-xl font-black">使いかたガイド</h1>
        </div>
        <p className="text-sm text-blue-100 leading-relaxed">
          Optis の全機能をわかりやすく説明します。<br />
          気になる項目のタイトルをタップして読んでみてね！
        </p>
      </div>

      {/* クイックナビ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-500 mb-3">🗂️ 読みたい章にジャンプ</p>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => {
                document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border ${s.border} ${s.bg} ${s.color}`}
            >
              {s.icon} {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* 検索 */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="キーワードで検索（例: EXP、目標、ローン）"
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-blue-400"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 検索ヒット数 */}
      {search.trim().length >= 2 && (
        <p className="text-xs text-gray-400 text-center">
          「{search}」の検索結果: {filtered.reduce((s, sec) => s + sec.items.length, 0)} 件
        </p>
      )}

      {/* セクション一覧 */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-sm">該当する項目が見つかりませんでした</p>
          </div>
        ) : (
          filtered.map(section => (
            <div key={section.id} id={`sec-${section.id}`}>
              <SectionCard section={section} />
            </div>
          ))
        )}
      </div>

      {/* フッター */}
      <div className="text-center py-4 space-y-1">
        <p className="text-xs text-gray-400">わからないことがあったら親と一緒に読んでみよう！</p>
        <p className="text-[10px] text-gray-300">Optis ユーザーガイド v1.0</p>
      </div>
    </div>
  );
}
