# アーキテクチャ設計書：ベンチマーク問題レビューツール

## 1. システムアーキテクチャ概要

本ツールは、シングルページアプリケーション（SPA）として実装し、ブラウザ上で完結するスタンドアロン型のWebアプリケーションです。

### 1.1 技術スタック
- **フロントエンド**: HTML5 + CSS3 + Vanilla JavaScript (ES6+)
- **バックエンド**: Python 3 + HTTPサーバー（カスタム実装）
- **データストレージ**: LocalStorage (ブラウザ内蔵、一時保存用)
- **ファイルI/O**: Fetch API（相対パスでの読み込み）+ サーバーPOST（保存）
- **データ形式**: JSON
- **バージョン管理**: Git

### 1.2 選定理由
- **Vanilla JavaScript**: 外部依存なし、軽量、即座に動作
- **LocalStorage**: 一時保存、オフライン対応、ブラウザ再起動後も復元可能
- **Python HTTPサーバー**: シンプルなファイル保存機能、カスタムPOSTエンドポイント実装が容易
- **Fetch API**: 相対パスでのファイル読み込み、非同期処理

## 2. システム構成

### 2.1 ディレクトリ構造

```
ModelVistaPlus/
├── model/                          # ベンチマーク問題データ（既存）
│   ├── activity001/
│   │   ├── dgpowerpoint_ja-fs8.png
│   │   ├── qa_new_ja.json
│   │   ├── qa_new_ja2.json
│   │   ├── qa_new_ja_approved.json      # レビュー結果（採用）
│   │   ├── qa_new_ja_rejected.json      # レビュー結果（不採用）
│   │   ├── qa_new_ja2_approved.json     # レビュー結果（採用）
│   │   ├── qa_new_ja2_rejected.json     # レビュー結果（不採用）
│   │   └── review_status.json           # レビュー状態（統合）
│   ├── activity002/
│   └── ...
├── src/                            # ツールソースコード
│   ├── index.html                  # メインHTML
│   ├── styles.css                  # スタイルシート
│   ├── app.js                      # メインアプリケーションロジック
│   ├── fileHandler.js              # ファイル読み込み処理
│   ├── reviewManager.js            # レビュー状態管理
│   └── exporter.js                 # JSON出力処理
├── spec/                           # 仕様書
│   ├── req.md                      # 要件定義書
│   ├── arch.md                     # アーキテクチャ設計書
│   └── user_man.md                 # ユーザマニュアル
├── server.py                       # カスタムHTTPサーバー（ファイル保存機能付き）
├── start_server.sh                 # サーバー起動スクリプト
└── README_REVIEW_TOOL.md           # ツール概要
```

### 2.2 データフロー

```
[ユーザ]
    ↓
[ブラウザ: http://localhost:8000/src/index.html]
    ↓
[app.js] ← メインコントローラ
    ↓
    ├─→ [fileHandler.js] → [Fetch API] → [server.py] → [model/*/qa_new_ja.json]
    │                                                   [model/*/qa_new_ja2.json]
    │                                                   [model/*/dgpowerpoint_ja-fs8.png]
    │
    ├─→ [reviewManager.js] → [LocalStorage] ← レビュー状態の一時保存/読み込み
    │
    └─→ [exporter.js] → [Fetch POST /save-json] → [server.py] → [model/*/qa_new_ja_approved.json]
                                                                  [model/*/qa_new_ja_rejected.json]
                                                                  [model/*/qa_new_ja2_approved.json]
                                                                  [model/*/qa_new_ja2_rejected.json]
                                                                  [model/*/review_status.json]
```

## 3. モジュール設計

### 3.1 app.js（メインアプリケーション）

**責務**:
- UI全体の制御
- イベントハンドリング
- 各モジュール間の調整

**主要な関数**:
```javascript
// アプリケーション初期化
function initApp()

// フォルダドロップダウンの初期化
async function initFolderDropdown()

// フォルダ選択時の処理（JSONファイル自動検出）
async function handleFolderChange()

// JSONファイル選択時の処理
async function handleJsonChange()

// レビュー済み状態の確認
async function checkIfReviewed(folderName, jsonFileName)

// 画像読み込み
async function loadImageFromServer(folderName)

// 現在の問題を表示
function displayQuestion(index)

// 採用/不採用ボタンのクリック処理
function onReviewDecision(decision, remarks)

// 前へ/次へボタンのクリック処理
function navigateQuestion(direction)

// エクスポート処理（サーバーに保存）
async function exportResults()
```

**データ構造**:
```javascript
const appState = {
  reviewerName: "",
  currentFolder: "",
  currentFile: "",
  questions: [],         // 読み込んだ問題配列
  currentIndex: 0,       // 現在の問題番号
  reviews: {}            // レビュー結果 {index: {decision, remarks, timestamp}}
};
```

### 3.2 fileHandler.js（ファイル操作）

**責務**:
- サーバー経由でのファイル読み込み
- JSONパース
- 画像の読み込み

**主要な関数**:
```javascript
// フォルダ一覧を取得（サーバーから）
async function getDefaultFolderList()

// 指定フォルダ内のJSONファイルを検出
async function detectAllJsonFiles(folderName)

// JSONファイルをFetch APIで読み込む
async function loadJsonFromServer(folderName, fileName)

// 画像をFetch APIで読み込む
async function loadImageByPath(folderName, imageName)
```

**実装詳細**:
- `Fetch API`を使用して相対パス（`../model/{フォルダ名}/{ファイル名}`）でファイルを取得
- `HEAD`リクエストでファイル存在確認
- `GET`リクエストで実際のデータ取得

### 3.3 reviewManager.js（レビュー状態管理）

**責務**:
- LocalStorageへの保存/読み込み
- レビュー進捗の管理
- レビュー状態の検証

**主要な関数**:
```javascript
// レビュー状態をLocalStorageに保存
function saveReviewState(state)

// レビュー状態をLocalStorageから読み込み
function loadReviewState(folderName, fileName)

// レビュー完了チェック
function isReviewComplete(reviews, totalQuestions)

// レビュー進捗の計算（未レビュー、採用、不採用の数）
function getReviewProgress(reviews)

// フィルタリング（レビュー済み/未レビューなど）
function filterQuestions(questions, reviews, filterType)
```

**LocalStorageキー設計**:
```javascript
// キー形式: "review_{folderName}_{fileName}"
// 例: "review_activity001_qa_new_ja"

// 保存内容:
{
  reviewerName: "山田太郎",
  folderName: "activity001",
  fileName: "qa_new_ja.json",
  lastModified: "2025-10-21T12:34:56.789Z",
  reviews: {
    0: { decision: "approved", remarks: "良問", timestamp: "..." },
    1: { decision: "rejected", remarks: "選択肢が曖昧", timestamp: "..." },
    ...
  }
}
```

### 3.4 exporter.js（JSON出力）

**責務**:
- レビュー結果をJSON形式で出力
- サーバー経由での保存機能の実装

**主要な関数**:
```javascript
// 採用問題のJSONを生成
function generateApprovedJson(questions, reviews, reviewerName)

// 不採用問題のJSONを生成
function generateRejectedJson(questions, reviews, reviewerName)

// 単一JSONファイルのレビュー状態を生成
function generateSingleReviewStatus(state, reviews)

// JSONデータをサーバーに保存
async function saveJsonToFolder(data, folderName, filename)

// review_status.jsonを更新（既存のものに追記）
async function updateReviewStatus(folderName, state, reviews)

// 全結果を一括エクスポート（フォルダに直接保存）
async function exportAllResults(state)
```

**出力ファイル形式**:

1. **qa_new_ja_approved.json** (採用問題)
```json
[
  {
    "tag": "依存関係",
    "question": "...",
    "choice": ["...", "...", "...", "..."],
    "authored_by": "claude",
    "is_translated": false,
    "review": {
      "reviewer": "山田太郎",
      "decision": "approved",
      "remarks": "良問",
      "timestamp": "2025-10-21T12:34:56.789Z"
    }
  }
]
```

2. **qa_new_ja_rejected.json** (不採用問題)
```json
[
  {
    "tag": "機能要求",
    "question": "...",
    "choice": ["...", "...", "...", "..."],
    "authored_by": "claude",
    "is_translated": false,
    "review": {
      "reviewer": "山田太郎",
      "decision": "rejected",
      "remarks": "選択肢が曖昧",
      "timestamp": "2025-10-21T12:34:56.789Z"
    }
  }
]
```

3. **review_status.json** (レビュー状態 - 新形式：統合版)
```json
{
  "folderName": "activity001",
  "reviews": {
    "qa_new_ja.json": {
      "fileName": "qa_new_ja.json",
      "reviewerName": "山田太郎",
      "totalQuestions": 10,
      "reviewedQuestions": 10,
      "approvedCount": 7,
      "rejectedCount": 3,
      "isComplete": true,
      "startedAt": "2025-10-21T07:24:49.819Z",
      "completedAt": "2025-10-21T08:27:30.718Z",
      "reviews": [
        {
          "questionIndex": 0,
          "decision": "approved",
          "remarks": "良問",
          "timestamp": "2025-10-21T10:05:00.000Z"
        }
      ]
    },
    "qa_new_ja2.json": {
      "fileName": "qa_new_ja2.json",
      "reviewerName": "山田太郎",
      "totalQuestions": 8,
      "reviewedQuestions": 8,
      "approvedCount": 5,
      "rejectedCount": 3,
      "isComplete": true,
      "startedAt": "2025-10-21T09:00:00.000Z",
      "completedAt": "2025-10-21T09:15:00.000Z",
      "reviews": [...]
    }
  },
  "lastUpdated": "2025-10-21T09:15:00.000Z"
}
```

## 4. UI設計

### 4.1 レイアウト
- **2カラムレイアウト**: 左側に画像、右側に問題とレビューUI
- **レスポンシブ**: 最小幅1280px推奨
- **固定ヘッダー**: レビュワー名入力欄を常時表示
- **ファイル選択セクション**: フォルダ・JSON選択ドロップダウン、レビュー済み表示
- **固定フッター**: ナビゲーションボタン、エクスポートボタン
- **スクロール不要設計**: CSS最適化により1画面に全UI要素を表示

### 4.2 配色・デザイン
- **正解選択肢の強調**: 背景色（#d4edda）、太字、アイコン（★）
- **採用ボタン**: 緑色（#28a745）
- **不採用ボタン**: 赤色（#dc3545）
- **未レビュー**: グレー（#6c757d）
- **レビュー済み表示**: 緑色チェックマーク（✅）
- **フォント**: システムフォント（-apple-system, BlinkMacSystemFont, sans-serif）

### 4.3 インタラクション
- **採用/不採用未選択時**: 「次へ」ボタンを無効化
- **最終問題**: 「次へ」を「完了」に変更
- **自動保存**: 採用/不採用選択時に自動的にLocalStorageに保存
- **ドロップダウン選択**: フォルダ選択 → JSON自動検出・選択 → 画像・問題自動読み込み

## 5. データ管理

### 5.1 データ永続化戦略
- **LocalStorage**: レビュー作業中の一時保存
  - 容量制限: 約5-10MB（ブラウザ依存）
  - 問題数が多い場合は問題ないが、画像データは保存しない
  - キー形式: `review_{folderName}_{fileName}`

- **サーバー保存**: 最終的な成果物
  - `model/{フォルダ名}/`に直接保存
  - `server.py`の`/save-json`エンドポイントを使用
  - Gitでバージョン管理
  - インデント付きJSON（可読性優先）

### 5.2 Git運用との統合

**運用フロー**:
1. Pythonサーバーを起動（`python3 server.py`）
2. `git pull` で最新状態を取得
3. レビュー作業実施（LocalStorageに自動保存）
4. 「エクスポート」でサーバー経由で`model/{フォルダ名}/`に保存
5. `git add model/{フォルダ名}/*_approved.json model/{フォルダ名}/*_rejected.json model/{フォルダ名}/review_status.json`
6. `git commit -m "Review: {フォルダ名}/{ファイル名} by {レビュワー名}"`
7. `git push`

**競合回避策**:
- `review_status.json`でレビュー担当者と日時を記録
- 同じJSONファイルを複数人が同時にレビューしない運用ルール
- `qa_new_ja.json`と`qa_new_ja2.json`は独立管理（異なる人が同時レビュー可能）
- 競合した場合は手動マージ（マニュアルに記載）

### 5.3 データスキーマ

**入力スキーマ**（既存）:
```typescript
interface Question {
  tag: string;
  question: string;
  choice: [string, string, string, string];  // 常に4つ、choice[0]が正解
  authored_by: string;
  is_translated: boolean;
}
```

**出力スキーマ**（レビュー情報付き）:
```typescript
interface ReviewedQuestion extends Question {
  review: {
    reviewer: string;
    decision: "approved" | "rejected";
    remarks: string;
    timestamp: string;  // ISO 8601形式
  };
}
```

## 6. セキュリティ・エラーハンドリング

### 6.1 セキュリティ
- **XSS対策**: ユーザ入力（備考欄など）をエスケープ処理
- **ファイルアクセス**: ユーザが明示的に選択したファイルのみ読み込み
- **LocalStorage**: 機密情報は保存しない（問題内容とレビュー結果のみ）

### 6.2 エラーハンドリング
- **ファイル読み込みエラー**: JSONパースエラー、画像読み込みエラーをキャッチし、ユーザに通知
- **LocalStorage容量超過**: 古いレビュー状態を削除する機能
- **不正なJSON形式**: スキーマ検証を行い、エラーメッセージを表示

## 7. パフォーマンス最適化

### 7.1 画像最適化
- **遅延読み込み**: 画像は問題表示時に読み込み（プリロードなし）
- **キャッシュ**: Data URLをメモリにキャッシュ

### 7.2 DOM操作最適化
- **仮想DOM不使用**: シンプルな`innerHTML`更新
- **イベント委譲**: 親要素でイベントをキャッチ

### 7.3 LocalStorage最適化
- **差分更新**: 変更があった問題のみ保存
- **圧縮**: 必要に応じてJSON圧縮（オプション）

## 8. テスト戦略

### 8.1 テストデータ
- `model/activity001/`を使用
- 最低10問のテストケース

### 8.2 テストシナリオ
1. ファイル読み込みテスト
2. 問題表示テスト（正解の強調表示）
3. レビュー操作テスト（採用/不採用、備考）
4. ナビゲーションテスト（前へ/次へ）
5. LocalStorage保存/復元テスト
6. エクスポートテスト（JSON出力）
7. ブラウザ再起動後の復元テスト

## 9. 将来的な拡張

### 9.1 技術的拡張
- **フレームワーク導入**: React / Vueへの移行（複雑化した場合）
- **バックエンド**: Node.js + Express（サーバー管理が必要な場合）
- **データベース**: SQLiteまたはIndexedDB（大量データ対応）

### 9.2 機能拡張
- **画像比較機能**: 複数画像の並列表示
- **自動品質チェック**: 選択肢の長さ、文法チェック
- **統計ダッシュボード**: 採用率、タグ別集計
- **コラボレーション機能**: リアルタイム共有（WebSocket）

## 10. 開発環境

### 10.1 必要なツール
- **テキストエディタ**: VSCode推奨
- **ブラウザ**: Chrome、Edge、Opera（Fetch API対応ブラウザ）
- **Python 3**: サーバー起動用
- **Git**: バージョン管理

### 10.2 開発手順
1. `server.py`を作成（カスタムHTTPサーバー）
2. `start_server.sh`を作成（起動スクリプト）
3. `src/index.html`を作成
4. `src/styles.css`を作成（スクロール不要設計）
5. `src/app.js`を作成（ドロップダウン選択機能）
6. `src/fileHandler.js`を作成（Fetch API実装）
7. `src/reviewManager.js`を作成
8. `src/exporter.js`を作成（サーバーPOST実装）
9. 各モジュールを`index.html`で読み込み
10. サーバーを起動し、`http://localhost:8000/src/index.html`でテスト

### 10.3 デバッグ
- Chrome DevToolsのConsoleでログ確認
- LocalStorageの内容を確認（Application > Local Storage）
- Network Panelでファイル読み込み・POSTリクエストを確認
- Pythonサーバーのログで保存処理を確認

## 11. server.py（カスタムHTTPサーバー）

### 11.1 概要
Python 3のHTTPサーバーをベースに、ファイル保存機能を追加したカスタム実装。

### 11.2 主要機能
- **GET**: 静的ファイルの配信（HTML, CSS, JS, JSON, PNG）
- **POST `/save-json`**: JSONファイルの保存
- **CORS対応**: クライアント側からのFetch APIリクエストを許可

### 11.3 実装詳細
```python
class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/save-json':
            # リクエストボディを読み込み
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))

            # ファイル保存
            folder_name = request_data['folderName']
            filename = request_data['filename']
            data = request_data['data']

            file_path = os.path.join('model', folder_name, filename)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(data)
```

### 11.4 起動方法
```bash
python3 server.py
# または
./start_server.sh
```

サーバーは`http://localhost:8000`で起動します。

## 12. まとめ

本ツールは、シンプルなアーキテクチャで高い保守性と拡張性を両立します。Vanilla JavaScriptとPythonサーバーの組み合わせにより、軽量かつ実用的なツールを実現します。Git運用との統合により、複数人での協調作業も可能です。
