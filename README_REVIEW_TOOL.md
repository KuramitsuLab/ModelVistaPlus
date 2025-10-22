# ベンチマーク問題レビューツール

## 概要

このツールは、UMLモデル図などを参照する4選択問題（ベンチマーク問題）の品質レビューを効率化するためのブラウザベースのアプリケーションです。

## 主な機能

- **画像を見ながら問題をレビュー**：スクロール不要のコンパクトなレイアウト
- **採用・不採用の判定**：リアルタイムで保存
- **正解選択肢の視覚的な強調表示**：正解が一目で分かる
- **複数JSONファイル対応**：`qa_new_ja.json`と`qa_new_ja2.json`を切り替え可能
- **自動ファイル保存**：対象フォルダに直接保存（ダウンロード不要）
- **レビュー済み状態の表示**：各JSONファイルごとに独立して管理
- **LocalStorageによる自動保存**：途中で閉じても続きから再開可能
- **複数人でのGit運用に対応**

## クイックスタート

### 1. サーバーを起動

```bash
cd /path/to/ModelVistaPlus
./start_server.sh
```

または：

```bash
python3 server.py
```

サーバーが起動すると、以下のメッセージが表示されます：
```
サーバーが起動しました: http://localhost:8000
ブラウザで以下のURLを開いてください:
  → http://localhost:8000/src/index.html
```

### 2. ブラウザでアクセス

Chrome、Edge、またはOperaで以下のURLを開きます：
```
http://localhost:8000/src/index.html
```

### 3. レビューワー名を入力

画面右上の「レビュワー名」欄に名前を入力します（例: 山田太郎）。

### 4. フォルダとJSONファイルを選択

1. **フォルダ**ドロップダウンから対象フォルダを選択（例: `activity001`）
2. 自動的にフォルダ内のJSONファイルが検出され、**JSON**ドロップダウンが表示されます
3. レビューしたいJSONファイルを選択（例: `qa_new_ja.json` または `qa_new_ja2.json`）
4. 自動的に問題が読み込まれます

**レビュー済み表示：**
- すでにレビュー済みの場合、「✅ レビュー済み」と表示されます
- `qa_new_ja.json`と`qa_new_ja2.json`は独立して管理されます

### 5. 問題をレビュー

1. 左側の画像を確認
2. 右側の問題文と選択肢を確認（正解は緑色で強調表示）
3. 「採用」または「不採用」を選択
4. 必要に応じて備考欄にコメントを入力
5. 「次へ」ボタンで次の問題へ

### 6. 結果をエクスポート

1. すべての問題をレビュー（または一部でも可）
2. 「エクスポート」ボタンをクリック
3. 以下のファイルが**自動的に対象フォルダ内に保存**されます：
   - `qa_new_ja_approved.json` (採用問題) ※ファイル名はJSONに応じて変わります
   - `qa_new_ja_rejected.json` (不採用問題)
   - `review_status.json` (すべてのJSONファイルのレビュー状態を統合)

**例：**
- `qa_new_ja.json`をレビュー → `qa_new_ja_approved.json`, `qa_new_ja_rejected.json`
- `qa_new_ja2.json`をレビュー → `qa_new_ja2_approved.json`, `qa_new_ja2_rejected.json`

### 7. Gitにコミット

ファイルは自動的に`model/フォルダ名/`内に保存されます：

```bash
# 確認
ls model/activity001/

# Gitにコミット
git add model/activity001/*_approved.json
git add model/activity001/*_rejected.json
git add model/activity001/review_status.json
git commit -m "Review: activity001 by 山田太郎"
git push
```

## ファイル構成

```
ModelVistaPlus/
├── src/                         # ツールソースコード
│   ├── index.html               # メインHTML
│   ├── styles.css               # スタイルシート
│   ├── app.js                   # メインロジック
│   ├── fileHandler.js           # ファイル読み込み
│   ├── reviewManager.js         # レビュー状態管理
│   └── exporter.js              # JSON出力
├── server.py                    # カスタムHTTPサーバー（ファイル保存機能付き）
├── start_server.sh              # サーバー起動スクリプト
├── spec/                        # 仕様書
│   ├── req.md                   # 要件定義書
│   ├── arch.md                  # アーキテクチャ設計書
│   └── user_man.md              # ユーザマニュアル（詳細版）
└── model/                       # ベンチマーク問題データ
    └── activity001/
        ├── dgpowerpoint_ja-fs8.png      # 参照画像
        ├── qa_new_ja.json                # 問題ファイル1
        ├── qa_new_ja2.json               # 問題ファイル2
        ├── qa_new_ja_approved.json       # レビュー結果（採用）
        ├── qa_new_ja_rejected.json       # レビュー結果（不採用）
        ├── qa_new_ja2_approved.json      # レビュー結果（採用）
        ├── qa_new_ja2_rejected.json      # レビュー結果（不採用）
        └── review_status.json            # レビュー状態（統合）
```

### review_status.jsonの構造

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
      "reviews": [...]
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

## 詳細なドキュメント

- **要件定義書**: [spec/req.md](spec/req.md) - 全機能要求と非機能要求
- **アーキテクチャ設計書**: [spec/arch.md](spec/arch.md) - 技術スタックとモジュール設計
- **ユーザマニュアル**: [spec/user_man.md](spec/user_man.md) - 詳細な操作手順とFAQ

## 主な特徴

### 正解の視覚的強調

- 正解（常に1番目の選択肢）は**緑色の背景**と**★マーク**で表示されます
- これにより、正解を確認しながら問題の妥当性を素早く判断できます

### 自動保存

- レビュー結果はLocalStorageに自動保存されます
- ブラウザを閉じても、次回起動時に続きから再開できます

### Git運用対応

- 複数人でのレビュー作業を想定
- `review_status.json`でレビュー担当者と進捗を記録
- JSONファイルの差分が見やすい形式（インデント付き）

## トラブルシューティング

### 画像が表示されない

- `model/{フォルダ名}/dgpowerpoint_ja-fs8.png` が存在するか確認
- 「画像ファイル」で手動選択してください

### LocalStorageがいっぱいになった

- ブラウザの開発者ツール（F12）を開く
- Application > Local Storage > `file://` を選択
- 不要なレビュー状態を削除

### 「次へ」ボタンが押せない

- 「採用」または「不採用」を選択してから「次へ」をクリックしてください

## FAQ

**Q: 途中でブラウザを閉じても大丈夫ですか？**
A: はい。LocalStorageに自動保存されるため、次回起動時に続きから再開できます。

**Q: 複数人で同じフォルダをレビューできますか？**
A: 可能ですが、事前に担当者を決めることを推奨します。競合した場合は手動マージが必要です。

**Q: qa_old_ja.jsonには対応していますか？**
A: 現在は未対応です。将来のバージョンで対応予定です。

## サポート

- **バグ報告**: GitHubのIssueに報告
- **機能要望**: Pull Requestで提案

## ライセンス

このツールはプロジェクト内部で使用するためのツールです。

---

**Happy Reviewing!**
