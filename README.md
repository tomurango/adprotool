# こうこくーる (koukokuul)

個人開発者・クリエイターが「なぜ作ったか」「どんな思いか」を言語化し、SNS投稿文や動画スクリプトに変換する**発信伴走AIツール**。

---

## 機能

- **AIインタビュー**: チャット形式でAIが内面を引き出す深掘り対話
- **チェックシート**: 発信に必要な7項目を会話を通じて自動で埋めていく
- **コンテンツ生成**: SNS投稿文（Twitter/Instagram）・動画スクリプトをAIが生成
- **Twitter連携**: 生成した投稿文をそのまま投稿

---

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバー起動

```bash
npm run dev
```

### 3. ブラウザでアクセス

```
http://localhost:3000
```

### 4. APIキーを設定

初回起動後、画面右上の「設定」からAPIキーを登録する。

| プロバイダー | 取得先 | デフォルト |
|---|---|---|
| **Gemini** | [Google AI Studio](https://aistudio.google.com/apikey) | ✅ |
| Claude | Anthropic Console | - |
| OpenAI | OpenAI Platform | - |

デフォルトは Gemini。変更する場合は `ai.config.ts` の `defaultProvider` を編集する。

---

## 環境変数（任意）

設定UIの代わりに `.env.local` にAPIキーを書くこともできる（フォールバックとして機能）。

```bash
cp .env.local.example .env.local  # ※まず .env.local をコピー
```

```env
GEMINI_API_KEY=your_key_here
CLAUDE_API_KEY=
OPENAI_API_KEY=

TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_CALLBACK_URL=http://localhost:3000/api/sns/twitter/callback

DATABASE_PATH=./db/koukokuul.sqlite
```

---

## 技術スタック

| 分類 | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| DB | SQLite (better-sqlite3) + Drizzle ORM |
| スタイル | Tailwind CSS |
| AI | Gemini / Claude / OpenAI（切り替え可能） |
| SNS | Twitter API v2 |

---

## AIの構成

```
会話AI      ── 自然なインタビュー対話
抽出AI      ── 会話からチェックシート回答を自動抽出
生成AI      ── SNS投稿文・動画スクリプト生成
進捗管理    ── コードで制御（AIなし）
```

詳細は `CLAUDE.md` を参照。
