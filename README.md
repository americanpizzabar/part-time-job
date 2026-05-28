# 子供のお小遣い管理アプリ

子供のお手伝いと定期お小遣いを記録・集計するWebアプリ。
Next.js 16 + Prisma 7 + PostgreSQL (Neon) + Tailwind CSS。

## 機能

### お手伝い・お小遣い
- お手伝いCRUD（毎日・曜日指定・日付指定・期間指定スケジュール）
- 1日 / 3日 / 1週間 / 2週間 / 1カ月のカレンダービュー
- ワンタップでお手伝いの完了チェック、当日限りの追加お手伝い
- 任意期間でのお小遣い集計と支払い管理
- お手伝い別の達成率と統計（今日/今週/今月/今年/カスタム）

### 家計簿（お小遣いと連動）
- **Needs / Wants の仕分け記録** — 支出を「必要」「欲しい」で分類し、月末レポートで2色円グラフ＋ひと言フィードバック
- **目標貯金＆貯金メーター** — 目標額・期日・画像を登録し、進捗をプログレスバー表示
- **おねだりプレゼン** — 高額品を「理由・自己負担額・おねだり額」で親に交渉、親が承認すると補助額がお小遣いに自動加算
- **収支カレンダー＆残高管理** — 日ごとの収入(青)/支出(赤)、財布残高と「自由に使えるお金」を分けて表示
- **親子プライバシー配慮** — 親ビューは残高・総額・Needs/Wants割合のみ。個別履歴は子供が非公開設定可能。おねだり申請時のみ詳細を共有

### 連動の仕組み
- お小遣い集計を「支払済」にすると収入として自動計上
- おねだりプレゼン承認で補助額を収入に自動加算
- 貯金は「自由に使えるお金」の範囲でのみ可能

---

## ローカル開発

### 前提

- Node.js 20以上
- PostgreSQL（Neonの開発用DB、ローカルのPostgres、またはDocker）

> 接続先のホスト名に `neon.tech` を含む場合は Neon サーバーレスドライバ、
> それ以外（localhost等）は node-postgres ドライバを自動で使い分けます。

### セットアップ

```bash
npm install

# .env を作成
cp .env.example .env
# DATABASE_URL と DIRECT_URL を編集（ローカルPostgresなら両方同じでOK）
# 例: postgresql://postgres@localhost:5432/allowance?schema=public

# DBにスキーマを適用
npx prisma migrate deploy

# 開発サーバー起動
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。初回アクセス時にサンプルのお手伝いが自動投入されます。

---

## Vercelで公開する手順

### 1. GitHubにプッシュ

このプロジェクトをGitHubリポジトリにpush済みである前提です。

### 2. Vercelプロジェクトを作成

1. [vercel.com/new](https://vercel.com/new) を開く
2. GitHubアカウントで連携し、このリポジトリを選択
3. **Framework Preset** が自動で `Next.js` になることを確認
4. **Build Command** はそのまま（`npm run build` がProstgresマイグレーションも実行）
5. **まだDeployは押さない** — DBを先に追加します

### 3. Neon Postgresを接続（無料）

1. プロジェクトの **Storage** タブを開く
2. **Create Database** → **Marketplace Database Providers** から **Neon** を選択
3. プラン **Free** を選択して作成
4. 作成後 **Connect Project** → 環境変数が自動で追加されます：
   - `DATABASE_URL` (pooled connection — アプリ実行用)
   - `DIRECT_URL` または `DATABASE_URL_UNPOOLED` (直接接続 — マイグレーション用)

> **重要**: Neon統合で `DATABASE_URL_UNPOOLED` という名前で追加された場合、
> Vercelの **Settings → Environment Variables** で `DIRECT_URL` という名前にコピーしてください。
> （`prisma.config.ts` が `DIRECT_URL` を参照しているため）

### 4. Deploy

1. **Deployments** タブから最新のデプロイをRedeploy（または初回Deploy）
2. ビルドログで以下が成功することを確認：
   ```
   prisma migrate deploy
   Applying migration `20260509140000_init`
   ```
3. 完了するとURLが発行される（例: `https://your-app.vercel.app`）

### 5. 初回データの投入

デプロイされたURLに最初にアクセスすると、サンプルデータ（お手伝い6種類・スケジュール・基本お小遣い¥500/週）が自動で投入されます。

---

## アクセス方法

### 親のスマホ・PC
- 公開された `https://<your-app>.vercel.app` を開く
- ブックマーク or ホーム画面に追加

### 子供のスマホ
- 同じURLを共有
- iPhone Safariの「ホーム画面に追加」 / Androidの「ホームに追加」でアプリ風に使えます

### 共有する際の注意
- このアプリは現在 **認証なし** のため、URLを知っている人は誰でも編集できます
- 家族内だけで使う場合はURLを公開しなければ問題ありませんが、より安全にしたい場合は以下を検討：
  - **Vercel Password Protection**（Pro以上の機能、$20/月）
  - 簡易BASIC認証を `middleware.ts` に追加
  - Auth.js（旧NextAuth）でGoogle/メールログインを追加

---

## トラブルシューティング

### ビルドが `prisma migrate deploy` で失敗する
- Vercel側の `DIRECT_URL` 環境変数が設定されているか確認
- Neon側で `DATABASE_URL_UNPOOLED` という名前になっている場合は手動で `DIRECT_URL` という名前にもコピー

### "Can't reach database server" エラー
- `DATABASE_URL` の末尾に `?sslmode=require` が付いているか確認
- Neonダッシュボードでブランチが起動しているか確認

### スキーマを変更したいとき
```bash
# schema.prismaを編集してから
npx prisma migrate dev --name <変更内容>
git add prisma/migrations && git commit && git push
# Vercelが自動でmigrate deployを実行
```

---

## 技術スタック

| カテゴリ | 利用技術 |
|---------|----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 7 |
| Hosting | Vercel |
