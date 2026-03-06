# CLAUDE.md - こうこくーる 開発ガイド

Claude Code がこのプロジェクトで作業する際に参照するドキュメント。

---

## プロジェクト概要

個人開発者・クリエイターが「なぜ作ったか」「どんな思いか」を言語化し、SNS投稿文や動画スクリプトに変換する**発信伴走AIツール**。ローカルファースト（SQLite）で動作する。

---

## AI アーキテクチャ方針（Director パターン）

### 役割の分離

| エージェント | 担当 | 実装箇所 |
|---|---|---|
| **ディレクターAI** | 会話分析・回答抽出・次ターン指示生成 | `src/lib/ai/prompts/extraction.ts` |
| **会話AI** | ディレクターの指示に従った自然な対話のみ | `src/lib/ai/prompts/interview.ts` |
| **進捗管理** | 次の質問選択・完了判定（コードのみ、AIなし） | `src/app/api/ai/chat/route.ts` |
| **生成AI** | SNS投稿文・動画スクリプト生成 | `src/lib/ai/prompts/sns-post.ts` 等 |

### 1ターンの実行順（重要）

```
1. ディレクターAI（非ストリーミング・先行実行）
   - 現在の会話履歴を分析
   - 各チェック項目の gathered（読み取れた内容）/ missing（不足情報）を出力
   - answered: true の項目をDBに保存（厳格な基準：十分な情報が揃った時のみ）
   - 次ターンの directive（focus / approach）を生成
   → SSEで { director: true, insights, directive, updatedItemIds } を送信

2. 会話AI（ストリーミング）
   - ディレクターの directive を system prompt に組み込んで返答
   → SSEで { chunk: "..." } を順次送信

3. 進捗管理（コード）
   → SSEで { done: true, conversationId, nextChecklistItemId, allCompleted } を送信
```

### 会話AIの責務と制約

- **やること**: ディレクティブに従った自然な深掘り対話
- **やらないこと**: チェック完了の判断・チェックシート状態の出力・構造化情報の抽出
- system prompt にはチェックシート全状態を**渡さない**。ディレクターの指示（focus/approach）のみ渡す
- `[CHECK_COMPLETE]` タグ方式は**廃止済み**。絶対に復活させない

### ディレクターAIの出力型

```typescript
interface DirectorResult {
  extracted: {
    id: string;
    answered: boolean;   // true = 十分な情報が揃った（厳格）
    gathered: string | null; // 読み取れた内容（部分的でも記録）
    missing: string | null;  // まだ足りていない情報
  }[];
  directive: {
    focus: string;    // 次に深掘りすべきテーマ
    approach: string; // どんな角度・スタイルで聞くか
  } | null;
}
```

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
AIプロバイダー: DB設定優先（user_settings.ai_provider） > ai.config.ts フォールバック
Markdownレンダリング: react-markdown（インタビューのアシスタントメッセージのみ）
パッケージ管理: npm
```

---

## ディレクトリ構成と責務

```
src/
├── app/
│   ├── api/
│   │   ├── ai/chat/route.ts                    # ディレクターAI → 会話AI を呼ぶメインルート
│   │   ├── projects/[id]/conversations/route.ts # 最新会話履歴取得
│   │   ├── outputs/                             # 生成AI（SNS投稿・スクリプト）
│   │   ├── projects/                            # プロジェクトCRUD
│   │   └── settings/                            # APIキー・プロバイダー管理
│   ├── projects/[id]/
│   │   ├── interview/page.tsx     # インタビューUI（SSEストリーミング受信）
│   │   ├── checklist/page.tsx     # チェックシート表示・インライン編集
│   │   └── outputs/page.tsx       # アウトプット生成・管理
│   └── settings/page.tsx          # APIキー設定・AIプロバイダー選択UI
├── lib/
│   ├── ai/
│   │   ├── index.ts               # AIの唯一のエントリーポイント
│   │   ├── types.ts               # AIProvider インターフェース
│   │   ├── providers/             # 各プロバイダーの実装
│   │   └── prompts/
│   │       ├── interview.ts       # 会話AI用プロンプト（directive のみ受け取る）
│   │       ├── extraction.ts      # ディレクターAI用プロンプト・型定義
│   │       ├── sns-post.ts        # SNS投稿生成プロンプト
│   │       └── video-script.ts    # 動画スクリプト生成プロンプト
│   ├── db/
│   │   ├── index.ts               # DB接続（better-sqlite3 + Drizzle）
│   │   ├── schema.ts              # テーブル定義
│   │   └── init.ts                # CREATE IF NOT EXISTS（シングルトン）
│   ├── sns/                       # SNS連携抽象化
│   ├── output-formats/            # アウトプット形式定義
│   ├── checklist.ts               # デフォルト7項目
│   └── user-settings.ts           # APIキーのDB読み書き・resolveApiKey
```

---

## 重要な設計ルール

### API Route
- 全 Route に `export const dynamic = 'force-dynamic'` を必ず付ける（ビルド時のSQLite競合防止）
- `initDb()` はモジュールレベルではなく**ハンドラ関数内**で呼ぶ
- 外部キー制約に注意。削除時は子テーブルを先に消す順序: `messages → conversations → outputs → project_sns_auth → checklist_items → projects`

### AI 呼び出し
- アプリ内から直接プロバイダーSDKを呼ばない。必ず `src/lib/ai/index.ts` 経由
- AIプロバイダーは遅延初期化（プロキシパターン）。ビルド時のAPIキーエラーを防ぐため
- プロバイダー選択: DB（`user_settings.ai_provider`）> `ai.config.ts` defaultProvider の順で解決

### ディレクターAIのJSONパース
- `parseDirectorResult()` で `raw.match(/\{[\s\S]*\}/)` によりJSONブロックを抽出
- JSON文字列値内のリテラル改行をスペースに置換してからパース（AIが改行を入れることがある）
- `maxTokens: 3000` を確保すること（7項目分の extracted + directive で 1000〜2000 トークン必要）

### DB
- `ChecklistItem.isCompleted` は `boolean | null`（DrizzleのSQLiteデフォルト型）。比較は `!!item.isCompleted` を使う
- マイグレーションファイルは使わず `init.ts` の `CREATE IF NOT EXISTS` で管理

### フロントエンド
- IME変換中の Enter 送信防止: `onCompositionStart/End` で `isComposing` フラグを管理
- SSE（Server-Sent Events）でストリーミング受信。イベント種別: `director` → `chunk` → `done`
- インタビューページのアシスタントメッセージは `react-markdown` でレンダリング
- `h-screen overflow-hidden` でビューポート固定し、チャットと サイドバーを独立スクロール

---

## APIキー管理

優先順位: **DB（設定UI）> .env.local（フォールバック）**

- ユーザーは `/settings` ページでプロバイダー選択 + APIキーを入力・保存
- DBの `user_settings` テーブルに保存（`/db/koukokuul.sqlite`、Gitで管理外）
- `src/lib/user-settings.ts` の `resolveApiKey()` が自動的に優先順位で解決
- 各プロバイダーは請求先情報の登録が必要（Gemini: Google Cloud、Claude/OpenAI: プリペイド）

---

## Git 管理対象外

```
.env.local          # APIキー
/db/                # SQLiteデータファイル
node_modules/
.next/
```
