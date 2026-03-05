# こうこくーる (koukokuul) - 新規実装仕様書プロンプト

以下の仕様に従って、こうこくーる (koukokuul) というWebアプリケーションをフルスクラッチで実装してください。

---

## プロジェクト概要

**コンセプト**: 個人開発者・創業者が「なぜ作ったか」「どんな思いで作っているか」という内面を引き出し、SNS投稿文や動画スクリプトへ変換する「発信伴走AI」ツール。

**ターゲット**: 自分のサービスや作品を発信したい個人開発者・クリエイター

**動作環境**: ローカルファースト（localhost で動作）。将来的にクラウド同期・スマホ対応に拡張可能。

---

## 技術スタック

```
フレームワーク:  Next.js 14+ (App Router)
言語:          TypeScript
DB:            SQLite (better-sqlite3) - ローカルファースト
ORM:           Drizzle ORM（Firestoreと互換性のあるスキーマ設計）
スタイル:       Tailwind CSS
AIプロバイダー: Gemini API (デフォルト) / 切り替え可能な抽象化レイヤー
SNS連携:       Twitter API v2 優先 / 抽象化レイヤーで拡張可能
状態管理:       Zustand
```

---

## ディレクトリ構成

```
koukokuul/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # トップ（プロジェクト一覧）
│   │   ├── projects/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx        # プロジェクト詳細
│   │   │   │   ├── checklist/
│   │   │   │   │   └── page.tsx    # チェックシート
│   │   │   │   ├── interview/
│   │   │   │   │   └── page.tsx    # AIインタビュー（チャット）
│   │   │   │   └── outputs/
│   │   │   │       └── page.tsx    # 生成アウトプット一覧
│   │   └── api/
│   │       ├── ai/
│   │       │   └── chat/route.ts   # AIチャットエンドポイント
│   │       ├── outputs/
│   │       │   └── generate/route.ts # SNS文/スクリプト生成
│   │       └── sns/
│   │           └── post/route.ts   # SNS投稿実行
│   │
│   ├── lib/
│   │   ├── ai/                     # AIプロバイダー抽象化レイヤー
│   │   │   ├── index.ts            # エントリーポイント・プロバイダー切り替え
│   │   │   ├── types.ts            # 共通型定義
│   │   │   ├── providers/
│   │   │   │   ├── gemini.ts       # Gemini実装
│   │   │   │   ├── claude.ts       # Claude実装
│   │   │   │   └── openai.ts       # OpenAI実装
│   │   │   └── prompts/
│   │   │       ├── interview.ts    # インタビュープロンプト
│   │   │       ├── sns-post.ts     # SNS投稿生成プロンプト
│   │   │       └── video-script.ts # 動画スクリプト生成プロンプト
│   │   │
│   │   ├── sns/                    # SNS連携抽象化レイヤー
│   │   │   ├── index.ts            # エントリーポイント・プラットフォーム切り替え
│   │   │   ├── types.ts            # 共通型定義
│   │   │   └── platforms/
│   │   │       ├── twitter.ts      # Twitter API v2実装
│   │   │       └── instagram.ts    # Instagram実装（将来）
│   │   │
│   │   ├── db/                     # データベース層
│   │   │   ├── index.ts            # DB接続・初期化
│   │   │   ├── schema.ts           # Drizzle スキーマ定義
│   │   │   └── migrations/         # マイグレーションファイル
│   │   │
│   │   └── output-formats/         # アウトプット形式定義
│   │       ├── index.ts            # 形式切り替えロジック
│   │       ├── sns-post.ts         # SNS投稿形式
│   │       └── video-script.ts     # 動画スクリプト形式（台本等）
│   │
│   ├── components/
│   │   ├── checklist/
│   │   ├── interview/
│   │   └── outputs/
│   │
│   └── types/
│       └── index.ts                # アプリ全体の型定義
│
├── db/
│   └── koukokuul.sqlite            # SQLiteデータファイル
│
├── ai.config.ts                    # AIプロバイダー設定（ユーザーが編集する）
├── sns.config.ts                   # SNS連携設定（ユーザーが編集する）
└── .env.local                      # APIキー等
```

---

## 重要設計方針

### 1. AI抽象化レイヤー (`src/lib/ai/`)

**目的**: AIプロバイダーをいつでも切り替え可能にする。コードを読めばどこでAIを使っているかが一目でわかる。

`src/lib/ai/index.ts` がすべてのAI呼び出しの唯一のエントリーポイント。アプリ内の他の箇所から直接プロバイダーのSDKを呼び出してはならない。

```typescript
// src/lib/ai/types.ts
export interface AIProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<string>;
  stream(messages: Message[], options?: ChatOptions): AsyncGenerator<string>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
```

```typescript
// src/lib/ai/index.ts
// このファイルがAI使用箇所の一覧になる
import { aiConfig } from '../../../ai.config';
import { GeminiProvider } from './providers/gemini';
import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai';

function createAIProvider(): AIProvider {
  switch (aiConfig.defaultProvider) {
    case 'gemini': return new GeminiProvider(aiConfig.providers.gemini);
    case 'claude': return new ClaudeProvider(aiConfig.providers.claude);
    case 'openai': return new OpenAIProvider(aiConfig.providers.openai);
    default: return new GeminiProvider(aiConfig.providers.gemini);
  }
}

export const ai = createAIProvider();

// アプリ内でのAI使用はすべてここ経由
export { interviewChat } from './prompts/interview';
export { generateSNSPost } from './prompts/sns-post';
export { generateVideoScript } from './prompts/video-script';
```

```typescript
// ai.config.ts（ユーザーが編集するファイル）
export const aiConfig = {
  defaultProvider: 'gemini' as 'gemini' | 'claude' | 'openai',
  providers: {
    gemini: {
      model: 'gemini-1.5-flash',
    },
    claude: {
      model: 'claude-sonnet-4-6',
    },
    openai: {
      model: 'gpt-4o-mini',
    },
  },
};
```

### 2. SNS抽象化レイヤー (`src/lib/sns/`)

AIと同様に、SNS投稿もすべて `src/lib/sns/index.ts` 経由で行う。

```typescript
// src/lib/sns/types.ts
export interface SNSPlatform {
  post(content: string, options?: PostOptions): Promise<PostResult>;
  validateContent(content: string): ValidationResult;
  getCharacterLimit(): number;
}

export interface PostOptions {
  scheduledAt?: Date;
  mediaUrls?: string[];
}
```

```typescript
// sns.config.ts（ユーザーが編集するファイル）
export const snsConfig = {
  defaultPlatform: 'twitter' as 'twitter' | 'instagram',
  platforms: {
    twitter: {
      enabled: true,
    },
    instagram: {
      enabled: false, // 将来対応
    },
  },
};
```

### 3. データモデル（Firestore互換設計）

SQLiteのテーブル構造をFirestoreのコレクション構造と揃えておく。将来のクラウド移行を容易にする。

```typescript
// src/lib/db/schema.ts

// projects コレクション相当
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),           // Firestore document ID 相当
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// checklist_items コレクション相当
export const checklistItems = sqliteTable('checklist_items', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  question: text('question').notNull(),    // 質問文
  answer: text('answer'),                  // 対話で得られた回答（null = 未回答）
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  order: integer('order').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// conversations コレクション相当
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  checklistItemId: text('checklist_item_id').references(() => checklistItems.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// messages コレクション相当
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// outputs コレクション相当
export const outputs = sqliteTable('outputs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  type: text('type', { enum: ['sns_post', 'video_script'] }).notNull(),
  platform: text('platform'),              // 'twitter', 'instagram' 等
  format: text('format'),                  // 'plain', 'scene_based', 'timeline' 等
  content: text('content').notNull(),      // 生成されたコンテンツ
  status: text('status', { enum: ['draft', 'posted', 'scheduled'] }).default('draft'),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// project_sns_auth コレクション相当
export const projectSnsAuth = sqliteTable('project_sns_auth', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  platform: text('platform').notNull(),
  accessToken: text('access_token'),
  accessTokenSecret: text('access_token_secret'),
  username: text('username'),
  connectedAt: integer('connected_at', { mode: 'timestamp' }),
});
```

### 4. アウトプット形式の拡張性

動画スクリプト等の出力形式は将来変更・追加できるよう設計する。

```typescript
// src/lib/output-formats/index.ts
export type OutputFormat = 'plain_script' | 'scene_based' | 'timeline';

export interface OutputFormatter {
  format: OutputFormat;
  label: string;
  generate(content: string, context: ProjectContext): string;
}

// 形式をここに追加していくだけで拡張可能
export const outputFormatters: Record<OutputFormat, OutputFormatter> = {
  plain_script: plainScriptFormatter,
  scene_based: sceneBasedFormatter,
  timeline: timelineFormatter,
};
```

---

## チェックシートのデフォルト項目

プロジェクト作成時に以下の項目を自動生成する。

```typescript
export const DEFAULT_CHECKLIST_ITEMS = [
  { order: 1, question: 'このサービス・プロダクトは何をするものですか？' },
  { order: 2, question: 'なぜ作ろうと思いましたか？きっかけや原体験は？' },
  { order: 3, question: 'どんな人に届けたいですか？' },
  { order: 4, question: '作る中で一番苦労したこと、乗り越えたことは？' },
  { order: 5, question: 'ユーザーに一番知ってほしいことは何ですか？' },
  { order: 6, question: '自分自身のバックグラウンドや経歴について教えてください' },
  { order: 7, question: '最近の進捗・アップデートはありますか？' },
];
```

---

## 主要画面仕様

### プロジェクト一覧（トップ）
- プロジェクトカード一覧
- 「新規プロジェクト作成」ボタン
- 各カードにチェックシート達成度バッジ（例: 3/7）

### プロジェクト詳細
- プロジェクト名・説明
- チェックシート達成度（プログレスバー）
- 「インタビューを始める」ボタン
- 生成済みアウトプット一覧（直近3件）
- SNS連携状態（Twitter: 連携済み/未連携）

### チェックシート画面
```
[プロジェクト名]の発信準備チェック    達成度: 3/7

✅ このサービスは何をするもの？         [回答を見る]
✅ なぜ作ろうと思った？                 [回答を見る]
✅ どんな人に届けたい？                 [回答を見る]
⬜ 作る中で一番苦労したこと             [話してみる →]
⬜ 今週/最近の進捗                      [話してみる →]
⬜ ユーザーに一番知ってほしいこと       [話してみる →]
⬜ 自分自身のバックグラウンド           [話してみる →]

[全項目が揃ったら投稿文を生成する]  ← 達成度100%で活性化（それ以下でも使用可）
```

### AIインタビュー画面（チャット）
- 左サイドバー: チェックシート項目一覧（現在フォーカス中の項目をハイライト）
- メイン: チャット画面
  - AIが選択した項目について深掘り質問
  - 回答が十分に得られたらAIが「チェック完了」を提案
  - 完了するとチェックシートに反映
- フッター: テキスト入力欄

AIの役割:
- 単なる質問ではなく「引き出す」対話をする
- 抽象的な回答に対して「具体的なエピソードはありますか？」と深掘り
- 回答が十分に得られたら自然に次の項目へ誘導

### アウトプット生成画面
- 生成タイプ選択: SNS投稿文 / 動画スクリプト
- プラットフォーム選択（SNSの場合）: Twitter / Instagram 等
- 形式選択（動画スクリプトの場合）: 台本形式 / シーン分け 等
- 「生成する」ボタン → 生成結果表示
- 生成結果の手動編集
- 「投稿する」「下書き保存」ボタン

---

## インタビューAIのプロンプト設計指針

```
あなたは個人開発者・クリエイターの「発信伴走AI」です。

目標: ユーザーが自分のサービスや作品について「なぜ作ったか」「どんな思いがあるか」を言語化し、それを発信コンテンツに変換できるよう支援する。

インタビューの原則:
1. 具体的なエピソードを引き出す（「たとえばどんな場面で？」）
2. 感情・背景に踏み込む（「そのとき、どんな気持ちでしたか？」）
3. 抽象的すぎる回答はやさしく深掘りする
4. 十分な情報が集まったら自然にまとめに入る
5. 敬語だが親しみやすいトーンを保つ

現在のプロジェクト情報とチェックシートの回答状況をコンテキストとして参照すること。
```

---

## 環境変数

```
# .env.local

# AI プロバイダー（ai.config.ts で切り替え）
GEMINI_API_KEY=
CLAUDE_API_KEY=
OPENAI_API_KEY=

# Twitter API
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_CALLBACK_URL=http://localhost:3000/api/sns/twitter/callback

# DB
DATABASE_PATH=./db/koukokuul.sqlite
```

---

## 実装順序（推奨）

### Phase 1: 基盤
1. Next.js プロジェクト初期化（TypeScript + Tailwind + App Router）
2. SQLite + Drizzle ORM セットアップ・スキーマ定義・マイグレーション
3. AI抽象化レイヤー実装（`src/lib/ai/`）
4. SNS抽象化レイヤー実装（`src/lib/sns/`）

### Phase 2: コア機能
5. プロジェクトCRUD（一覧・作成・詳細）
6. チェックシート画面（項目表示・達成度）
7. AIインタビュー画面（チャットUI + API Route）
8. チェックシートへの回答反映

### Phase 3: アウトプット
9. SNS投稿文生成
10. 動画スクリプト生成（台本形式）
11. アウトプット一覧・管理

### Phase 4: SNS連携
12. Twitter OAuth認証
13. Twitter投稿実行

---

## 将来の拡張を見据えた注意事項

- **Firestore移行**: SQLiteのスキーマはFirestoreのドキュメント構造と1対1で対応するよう設計済み。移行スクリプトを書けば即移行可能。
- **スマホ対応（Flutter）**: APIルートをREST APIとして整備しておくことで、FlutterアプリからNext.js APIを叩く形にできる。
- **動画生成**: `src/lib/ai/prompts/video-script.ts` でスクリプト生成を分離しており、将来的にRunway/Kling等の動画生成APIを `src/lib/video/` に追加する形で拡張可能。
- **認証**: 現状は不要（ローカル単一ユーザー）。Firebase Auth追加時は `src/lib/auth/` を追加しAPIルートにミドルウェアを追加する。

---

以上の仕様に従って実装を進めてください。
不明点があれば実装前に確認してください。
