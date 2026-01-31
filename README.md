# Free Time Finder (LINE版)

LINEでチームメンバー全員の空き時間を検索・共有するBotです。

---

## できること

| 機能 | 説明 |
|------|------|
| 全員の空き時間検索 | 複数人のGoogleカレンダーを参照して、全員が空いている時間を検索 |
| MTG調整に活用 | 空き時間をテキストで出力してコピペ可能 |

## 使い方

LINEで `。`（句点）を送ると空き時間が表示されます。

| コマンド | 説明 |
|---------|------|
| `。` | 今週の空き時間を表示 |
| `空き` | 今週の空き時間を表示 |
| `ヘルプ` | 使い方を表示 |

---

## セットアップ手順

> 困ったとき: 手順通りにいかない場合は、開発者（青木）に相談してください。

### 必要なアカウント

以下のサービスのアカウントが必要です（すべて無料で作成可能）：

1. **Cloudflare** - Botをインターネット上で動かすため
2. **LINE Developers** - LINE Botを作るため
3. **Google Cloud** - Googleカレンダーと連携するため

---

### ステップ1: LINE Botの作成

1. [LINE Developers](https://developers.line.biz/ja/) にアクセス
2. LINEアカウントでログイン
3. 「プロバイダー」を作成（会社名や個人名でOK）
4. 「新規チャネル作成」→「Messaging API」を選択
5. 必要情報を入力：
   - チャネル名: `空き時間検索Bot`（好きな名前でOK）
   - チャネル説明: `チーム全員の空き時間を検索するBot`
   - 大業種・小業種: 適当に選択
6. 作成後、「Messaging API設定」タブで：
   - 「チャネルアクセストークン（長期）」の「発行」をクリック → **コピーして保存**
   - 「チャネルシークレット」を **コピーして保存**

> メモしておくもの:
> - チャネルシークレット
> - チャネルアクセストークン（長期）

---

### ステップ2: Google Calendar APIの設定

#### 2-1. Google Cloudプロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. Googleアカウントでログイン
3. 画面上部の「プロジェクトを選択」→「新しいプロジェクト」
4. プロジェクト名を入力（例: `free-time-finder`）→「作成」

#### 2-2. Calendar APIを有効化

1. 左メニュー「APIとサービス」→「ライブラリ」
2. 検索バーで「Google Calendar API」を検索
3. クリックして「有効にする」

#### 2-3. サービスアカウントの作成

1. 左メニュー「APIとサービス」→「認証情報」
2. 「＋認証情報を作成」→「サービスアカウント」
3. サービスアカウント名を入力（例: `free-time-finder`）→「作成して続行」
4. ロールは選択せずに「続行」→「完了」
5. 作成したサービスアカウントをクリック
6. 「キー」タブ→「鍵を追加」→「新しい鍵を作成」
7. 「JSON」を選択→「作成」
8. JSONファイルがダウンロードされる

#### 2-4. JSONファイルから情報を取得

ダウンロードしたJSONファイルをテキストエディタで開き、以下をコピー：

- `client_email` の値（例: `xxx@xxx.iam.gserviceaccount.com`）
- `private_key` の値（`-----BEGIN PRIVATE KEY-----`で始まる長い文字列）

> メモしておくもの:
> - サービスアカウントメールアドレス（client_email）
> - 秘密鍵（private_key）

#### 2-5. 各メンバーのカレンダーへのアクセス権限を付与

**全員分のカレンダーに対して以下を行います：**

1. [Googleカレンダー](https://calendar.google.com/) を開く
2. 左側のカレンダー一覧から、対象カレンダーの「⋮」→「設定と共有」
3. 「特定のユーザーまたはグループと共有する」セクションで「ユーザーやグループを追加」
4. サービスアカウントのメールアドレスを入力
5. 権限を「予定の表示（すべての予定の詳細）」に設定→「送信」
6. 同じ設定画面の「カレンダーの統合」セクションで「カレンダーID」をコピー

> メモしておくもの:
> - 各メンバーのカレンダーID（通常はメールアドレス形式）

---

### ステップ3: Cloudflareへのデプロイ

#### 3-1. Cloudflareアカウント作成

1. [Cloudflare](https://cloudflare.com/) にアクセス
2. 「Sign Up」でアカウント作成

#### 3-2. Wranglerのインストール

ターミナルを開き、以下を実行：

```bash
# プロジェクトフォルダに移動
cd calendar-line-bot

# 依存関係をインストール
npm install

# Cloudflareにログイン（ブラウザが開きます）
npx wrangler login
```

#### 3-3. シークレットの設定

以下のコマンドを1つずつ実行し、メモしておいた値を入力：

```bash
# LINEチャネルシークレット
npx wrangler secret put LINE_CHANNEL_SECRET
# → メモした「チャネルシークレット」を貼り付けてEnter

# LINEチャネルアクセストークン
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
# → メモした「チャネルアクセストークン」を貼り付けてEnter

# Googleサービスアカウントメール
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
# → メモした「サービスアカウントメールアドレス」を貼り付けてEnter

# Google秘密鍵（改行を含む長い文字列）
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
# → メモした「秘密鍵」をそのまま貼り付けてEnter

# GoogleカレンダーIDs（カンマ区切りで複数指定）
npx wrangler secret put GOOGLE_CALENDAR_IDS
# → 「user1@gmail.com,user2@gmail.com,user3@gmail.com」のように入力
```

#### 3-4. デプロイ

```bash
npm run deploy
```

成功すると、URLが表示されます（例: `https://calendar-line-bot.xxx.workers.dev`）

---

### ステップ4: LINE Webhook URLの設定

1. LINE Developersコンソールに戻る
2. 「Messaging API設定」タブ
3. 「Webhook URL」に以下を入力：
   ```
   https://calendar-line-bot.あなたのサブドメイン.workers.dev/webhook
   ```
4. 「Webhookの利用」をオンにする
5. 「検証」ボタンで接続テスト

---

### ステップ5: 動作確認

1. LINE Developersの「Messaging API設定」にあるQRコードをスキャン
2. Botを友だち追加
3. `。` を送信して空き時間が表示されればOK！

---

## セキュリティについて

### 読み取り専用アクセス

このBotは「読み取り専用」でカレンダーにアクセスします。

**特徴:**
- 予定の追加・削除・変更は**できません**
- 予定の閲覧のみ（空き時間計算のため）
- APIキーなどはCloudflareの「シークレット」として暗号化保存

**安全な理由:**
- シークレットはCloudflareが暗号化して管理
- カレンダーへのアクセスは許可されたカレンダーのみ
- GoogleのAPIは通信が暗号化（HTTPS）されている

---

## トラブルシューティング

### Botが反応しない

- Webhook URLが正しく設定されているか確認
- 「Webhookの利用」がオンになっているか確認
- Cloudflareのログで確認: `npm run tail`

### 空き時間が表示されない

- 各メンバーのカレンダーでサービスアカウントにアクセス権限を付与したか確認
- カレンダーIDが正しいか確認（カンマ区切りで複数指定）
- GOOGLE_CALENDAR_IDSの設定を確認

### その他の問題

開発者（青木）に連絡してください。

---

## 技術スタック

- Cloudflare Workers
- TypeScript
- LINE Messaging API
- Google Calendar API（サービスアカウント認証、読み取り専用）

---

## 問い合わせ

セットアップで困ったこと、エラーが発生した場合は、開発者（青木）に連絡してください。
