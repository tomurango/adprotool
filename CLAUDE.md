# CLAUDE.md - こうこくーる 開発ガイド

Claude Code がこのプロジェクトで作業する際に参照するドキュメント。

---

## プロジェクト概要

個人開発者・クリエイターが「なぜ作ったか」「どんな思いか」を言語化し、SNS投稿文や動画スクリプトに変換する**発信伴走AIツール**。ローカルファースト（SQLite）で動作する。

---

## AI アーキテクチャ方針（2-Agent パターン）

### 役割の分離

| エージェント | 担当 | 実装箇所 |
|---|---|---|
| **会話AI** | 自然なインタビュー対話のみ | `src/lib/ai/prompts/interview.ts` |
| **抽出AI** | 会話履歴からチェックシート回答をJSON抽出 | `src/lib/ai/prompts/extraction.ts` |
| **進捗管理** | 次の質問選択・完了判定（コードのみ、AIなし） | `src/app/api/ai/chat/route.ts` |
| **生成AI** | SNS投稿文・動画スクリプト生成 | `src/lib/ai/prompts/sns-post.ts` 等 |

### 会話AIの責務

- **やること**: 自然な深掘り対話。ユーザーの回答に共感し、具体的なエピソードを引き出す
- **やらないこと**: チェック完了の判断、構造化された情報の抽出
- `[CHECK_COMPLETE]` タグ方式は**廃止済み**。絶対に復活させない

### 抽出AIの責務

- **やること**: 会話履歴を読んで「どの質問が答えられたか」をJSONで返す
- ユーザーが返答するたびに会話AIとは別に呼ばれる（直列、ストリーミングなし）
- チェックシートの更新はこのAIの出力に基づいて行う

### systemPrompt の渡し方

各プロバイダーでネイティブの形式を使う。呼び出し側は `options.systemPrompt` に文字列を渡すだけでよい。

| プロバイダー | 内部での処理 |
|---|---|
| **Gemini** | `getGenerativeModel({ systemInstruction: { parts: [{ text }] } })` で設定 |
| **Claude** | `system` パラメータに渡す |
| **OpenAI** | `{ role: 'system' }` としてメッセージ先頭に追加 |

---

## 技術スタック

```
フレームワーク:  Next.js 16 (App Router)
言語:          TypeScript（strict モード）
DB:            SQLite (better-sqlite3) + Drizzle ORM
スタイル:       Tailwind CSS v3
AIプロバイダー: ai.config.ts で切り替え（デフォルト: Gemini）
パッケージ管理: npm
```

---

## ディレクトリ構成と責務

```
src/
├── app/
│   ├── api/
│   │   ├── ai/chat/route.ts       # 会話AI + 抽出AI を呼ぶメインルート
│   │   ├── outputs/               # 生成AI（SNS投稿・スクリプト）
│   │   ├── projects/              # プロジェクトCRUD
│   │   └── settings/              # APIキー管理
│   ├── projects/[id]/
│   │   ├── interview/page.tsx     # インタビューUI（SSEストリーミング受信）
│   │   ├── checklist/page.tsx     # チェックシート表示
│   │   └── outputs/page.tsx       # アウトプット生成・管理
│   └── settings/page.tsx          # APIキー設定
├── lib/
│   ├── ai/
│   │   ├── index.ts               # AIの唯一のエントリーポイント
│   │   ├── types.ts               # AIProvider インターフェース
│   │   ├── providers/             # 各プロバイダーの実装
│   │   └── prompts/
│   │       ├── interview.ts       # 会話AI用プロンプト
│   │       ├── extraction.ts      # 抽出AI用プロンプト
│   │       ├── sns-post.ts        # SNS投稿生成プロンプト
│   │       └── video-script.ts    # 動画スクリプト生成プロンプト
│   ├── db/
│   │   ├── index.ts               # DB接続（better-sqlite3 + Drizzle）
│   │   ├── schema.ts              # テーブル定義
│   │   └── init.ts                # CREATE IF NOT EXISTS（シングルトン）
│   ├── sns/                       # SNS連携抽象化
│   ├── output-formats/            # アウトプット形式定義
│   ├── checklist.ts               # デフォルト7項目
│   └── user-settings.ts           # APIキーのDB読み書き
```

---

## 重要な設計ルール

### API Route
- 全 Route に `export const dynamic = 'force-dynamic'` を必ず付ける（ビルド時のSQLite競合防止）
- `initDb()` はモジュールレベルではなく**ハンドラ関数内**で呼ぶ
- 外部キー制約に注意。削除時は子テーブルを先に消す順序: `messages → conversations → outputs → project_sns_auth → checklist_items → projects`

### AI 呼び出し
- アプリ内から直接プロバイダーSDKを呼ばない。必ず `src/lib/ai/index.ts` 経由
- AIプロバイダーは遅延初期化（`_ai` プロキシパターン）。ビルド時のAPIキーエラーを防ぐため

### DB
- `ChecklistItem.isCompleted` は `boolean | null`（DrizzleのSQLiteデフォルト型）。比較は `!!item.isCompleted` を使う
- マイグレーションファイルは使わず `init.ts` の `CREATE IF NOT EXISTS` で管理

### フロントエンド
- IME変換中の Enter 送信防止: `onCompositionStart/End` で `isComposing` フラグを管理
- SSE（Server-Sent Events）でストリーミング受信。`data: {...}\n\n` 形式

---

## APIキー管理

優先順位: **DB（設定UI）> .env.local（フォールバック）**

- ユーザーは `/settings` ページでAPIキーを入力・保存
- DBの `user_settings` テーブルに保存（`/db/koukokuul.sqlite`、Gitで管理外）
- `src/lib/user-settings.ts` の `resolveApiKey()` が自動的に優先順位で解決

---

## Git 管理対象外

```
.env.local          # APIキー
/db/                # SQLiteデータファイル
node_modules/
.next/
```
