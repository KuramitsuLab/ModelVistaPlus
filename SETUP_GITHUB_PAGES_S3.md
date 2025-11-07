# GitHub Pages + S3連携セットアップガイド

このガイドでは、レビューツールをGitHub Pagesにデプロイし、レビュー結果をAWS S3に保存する環境を構築する手順を説明します。

## 目次

1. [GitHub Pagesのセットアップ](#1-github-pagesのセットアップ)
2. [AWS S3バケットの作成](#2-aws-s3バケットの作成)
3. [Lambda関数の作成](#3-lambda関数の作成)
4. [API Gatewayの設定](#4-api-gatewayの設定)
5. [レビューツールの設定](#5-レビューツールの設定)
6. [動作確認](#6-動作確認)
7. [トラブルシューティング](#7-トラブルシューティング)

---

## 1. GitHub Pagesのセットアップ

### 1.1 リポジトリの準備

```bash
# リポジトリのルートディレクトリで実行
cd /path/to/ModelVistaPlus

# GitHub Pagesブランチの作成（オプション: mainブランチから直接公開も可能）
git checkout -b gh-pages
```

### 1.2 GitHub Pagesの有効化

1. GitHubのリポジトリページにアクセス
2. **Settings** → **Pages** に移動
3. **Source** セクションで以下を設定：
   - Branch: `main` または `gh-pages`
   - Folder: `/` または `/docs` （toolディレクトリを公開する場合）
4. **Save** をクリック

### 1.3 ディレクトリ構成の調整（推奨）

GitHub Pagesでtoolディレクトリを公開する場合：

**オプションA: toolディレクトリをルートに移動**
```bash
# toolディレクトリの内容をdocsディレクトリに移動
mkdir -p docs
cp -r tool/* docs/
git add docs/
git commit -m "Add docs directory for GitHub Pages"
git push origin main
```

**オプションB: toolディレクトリをそのまま使用**
- GitHub PagesのURL: `https://username.github.io/ModelVistaPlus/tool/`

### 1.4 画像パスの確認

GitHub Pagesでは、モデルデータ（画像ファイル）もリポジトリに含める必要があります。

```bash
# modelディレクトリがコミットされているか確認
git ls-files model/

# まだコミットされていない場合
git add model/
git commit -m "Add model data for review tool"
git push origin main
```

---

## 2. AWS S3バケットの作成

### 2.1 S3バケットの作成

1. AWS Management Consoleにログイン
2. **S3** サービスに移動
3. **バケットを作成** をクリック
4. 以下の設定を行う：
   - **バケット名**: `review-tool-results`（任意の名前）
   - **リージョン**: `ap-northeast-1`（東京リージョン推奨）
   - **パブリックアクセスのブロック**: すべてブロック（推奨）

### 2.2 バケット構造の設計

レビュー結果は以下の構造で保存されます：

```
s3://review-tool-results/
  └── reviews/
      ├── 2025/
      │   ├── 01/
      │   │   ├── review_20250101_120000_abc123.json
      │   │   └── review_20250101_130000_def456.json
      │   └── 02/
      └── 2025/
```

### 2.3 バケットポリシーの設定

Lambda関数からのアクセスのみを許可します（後でLambda IAMロールを作成します）。

---

## 3. Lambda関数の作成

### 3.1 Lambda関数の作成

1. AWS Management Consoleで **Lambda** サービスに移動
2. **関数の作成** をクリック
3. 以下を設定：
   - **関数名**: `ReviewToolUploadHandler`
   - **ランタイム**: `Python 3.12`
   - **アーキテクチャ**: `x86_64`
   - **実行ロール**: 新しいロールを作成（基本的なLambda権限を持つロール）

### 3.2 Lambda関数コードの実装

以下のコードをLambda関数エディタに貼り付けます：

```python
import json
import boto3
import os
from datetime import datetime
import uuid

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'review-tool-results')

def lambda_handler(event, context):
    """
    レビューツールからのPOSTリクエストを受け取り、S3に保存
    """
    try:
        # CORSヘッダー
        headers = {
            'Access-Control-Allow-Origin': '*',  # 本番環境では適切なドメインに制限
            'Access-Control-Allow-Headers': 'Content-Type,X-API-Key',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        }

        # OPTIONSリクエスト（プリフライト）への対応
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'OK'})
            }

        # リクエストボディの取得
        body = json.loads(event.get('body', '{}'))
        review_data = body.get('reviewData')

        if not review_data:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'reviewData is required',
                    'details': 'リクエストボディにreviewDataが含まれていません'
                })
            }

        # タイムスタンプとファイル名の生成
        now = datetime.now()
        year = now.strftime('%Y')
        month = now.strftime('%m')
        timestamp = now.strftime('%Y%m%d_%H%M%S')
        review_id = review_data.get('review_id', str(uuid.uuid4()))

        # S3キーの生成
        s3_key = f"reviews/{year}/{month}/review_{timestamp}_{review_id}.json"

        # S3にアップロード
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=json.dumps(review_data, ensure_ascii=False, indent=2),
            ContentType='application/json',
            Metadata={
                'reviewer': review_data.get('reviewer_name', 'unknown'),
                'question_set': review_data.get('question_set', 'unknown')
            }
        )

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': 'アップロード成功',
                's3_key': s3_key,
                'review_id': review_id
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }
```

### 3.3 環境変数の設定

Lambda関数の **設定** → **環境変数** で以下を追加：

- **キー**: `S3_BUCKET_NAME`
- **値**: `review-tool-results`（作成したバケット名）

### 3.4 IAMロールの権限追加

Lambda関数の実行ロールに以下のポリシーを追加：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::review-tool-results/reviews/*"
        }
    ]
}
```

1. Lambda関数の **設定** → **アクセス権限** に移動
2. **実行ロール** のリンクをクリック（IAMコンソールが開く）
3. **インラインポリシーを追加** をクリック
4. 上記のJSONをペースト
5. ポリシー名: `S3WriteAccess`
6. **ポリシーの作成** をクリック

### 3.5 タイムアウト設定

Lambda関数の **設定** → **一般設定** で以下を設定：

- **タイムアウト**: `10秒`
- **メモリ**: `128 MB`

---

## 4. API Gatewayの設定

### 4.1 REST APIの作成

1. AWS Management Consoleで **API Gateway** サービスに移動
2. **APIを作成** をクリック
3. **REST API** を選択（パブリック）
4. 以下を設定：
   - **API名**: `ReviewToolAPI`
   - **エンドポイントタイプ**: `リージョン`

### 4.2 リソースとメソッドの作成

1. **リソース** → **アクション** → **リソースの作成**
   - **リソース名**: `upload`
   - **リソースパス**: `/upload`

2. `/upload` リソースを選択 → **アクション** → **メソッドの作成** → **POST**
   - **統合タイプ**: `Lambda 関数`
   - **Lambda 関数**: `ReviewToolUploadHandler`
   - **保存** をクリック

3. **CORS の有効化**
   - `/upload` リソースを選択
   - **アクション** → **CORSの有効化**
   - デフォルト設定のまま **CORSを有効にして既存のCORSヘッダーを置換** をクリック

### 4.3 APIキーの設定（オプション：推奨）

セキュリティ強化のためAPIキーを設定：

1. **APIキー** → **アクション** → **APIキーの作成**
   - **名前**: `ReviewToolAPIKey`
   - **保存** をクリック
   - **APIキーの値** をコピー（後で使用）

2. **使用量プラン** → **作成**
   - **名前**: `ReviewToolPlan`
   - **スロットリング**: リクエスト数/秒 = `10`、バーストサイズ = `20`
   - **クォータ**: 1日あたり `1000` リクエスト
   - **次へ** → 作成したAPIをステージに追加
   - APIキーを使用量プランに関連付け

3. POSTメソッドの設定
   - `/upload` → `POST` を選択
   - **メソッドリクエスト** をクリック
   - **APIキーの必要性**: `true` に設定

### 4.4 APIのデプロイ

1. **アクション** → **APIのデプロイ**
2. **デプロイされるステージ**: `[新しいステージ]`
3. **ステージ名**: `prod`
4. **デプロイ** をクリック

### 4.5 エンドポイントURLの取得

デプロイ後、以下の形式のURLが表示されます：

```
https://abcd1234.execute-api.ap-northeast-1.amazonaws.com/prod/upload
```

このURLをコピーしておきます。

---

## 5. レビューツールの設定

### 5.1 config.jsの作成

`tool/config.example.js` をコピーして `tool/config.js` を作成：

```bash
cd tool
cp config.example.js config.js
```

### 5.2 config.jsの編集

`tool/config.js` を以下のように編集：

```javascript
// AWS API Gateway設定
const AWS_CONFIG = {
    // S3保存を有効化
    enabled: true,

    // ステップ4で取得したAPI GatewayのエンドポイントURL
    apiEndpoint: 'https://abcd1234.execute-api.ap-northeast-1.amazonaws.com/prod/upload',

    // API認証キー（APIキーを設定した場合のみ）
    apiKey: 'あなたのAPIキー'
};

// 設定をグローバルに公開
window.AWS_CONFIG = AWS_CONFIG;
```

### 5.3 .gitignoreの更新

セキュリティのため、`config.js` をGitにコミットしないようにします：

```bash
# プロジェクトルートで実行
echo "tool/config.js" >> .gitignore
git add .gitignore
git commit -m "Add config.js to gitignore"
```

### 5.4 GitHub Pagesへのデプロイ

```bash
# すべての変更をコミット
git add .
git commit -m "Setup review tool with S3 integration"
git push origin main
```

数分後、以下のURLでアクセス可能になります：

```
https://username.github.io/ModelVistaPlus/tool/
```

---

## 6. 動作確認

### 6.1 レビューツールの起動

1. ブラウザで GitHub Pages URL にアクセス
2. レビューア名を入力
3. 問題セットを選択して開始

### 6.2 レビューの実行

1. 問題に回答
2. コメントを入力（任意）
3. 次の問題へ進む

### 6.3 S3アップロードの確認

#### ブラウザのコンソールで確認

1. ブラウザの開発者ツールを開く（F12）
2. **Console** タブを確認
3. 以下のようなログが表示されるはず：
   ```
   S3にアップロード成功: {message: "アップロード成功", s3_key: "reviews/2025/01/...", review_id: "..."}
   ```

#### AWS S3で確認

1. AWS Management Console → S3
2. `review-tool-results` バケットを開く
3. `reviews/YYYY/MM/` ディレクトリにJSONファイルが保存されているか確認

#### 手動アップロード

レビュー完了後、ホーム画面の「S3にアップロード」ボタンで一括アップロードも可能：

1. `tool/index.html` に戻る
2. **データ管理** セクションの **S3にアップロード** をクリック
3. 成功メッセージが表示されることを確認

---

## 7. トラブルシューティング

### 7.1 GitHub Pagesが表示されない

**原因**: GitHub Pagesの公開設定が正しくない

**解決方法**:
- Settings → Pages で正しいブランチとディレクトリが選択されているか確認
- 数分待ってから再度アクセス
- ブラウザのキャッシュをクリア

### 7.2 画像が表示されない

**原因**: 画像ファイルがリポジトリにコミットされていない

**解決方法**:
```bash
# modelディレクトリを確認
git status
git add model/
git commit -m "Add model images"
git push origin main
```

### 7.3 S3アップロードが失敗する

#### エラー: "config.js not found"

**原因**: `config.js` が作成されていない

**解決方法**:
```bash
cd tool
cp config.example.js config.js
# config.js を編集してAPI設定を追加
```

#### エラー: "403 Forbidden"

**原因**: APIキーが正しくない、またはCORS設定が不正

**解決方法**:
1. `config.js` のAPIキーが正しいか確認
2. API Gateway のCORS設定を確認
3. Lambda関数のCORSヘッダーを確認

#### エラー: "500 Internal Server Error"

**原因**: Lambda関数のエラー、またはIAM権限不足

**解決方法**:
1. AWS CloudWatch Logs でLambda関数のログを確認
2. Lambda実行ロールにS3書き込み権限があるか確認
3. S3バケット名が正しいか確認

### 7.4 CORSエラー

**エラーメッセージ**:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**解決方法**:
1. API Gateway で CORS を再度有効化
2. Lambda関数のレスポンスヘッダーに以下が含まれているか確認：
   ```python
   'Access-Control-Allow-Origin': '*'
   'Access-Control-Allow-Headers': 'Content-Type,X-API-Key'
   'Access-Control-Allow-Methods': 'POST,OPTIONS'
   ```
3. OPTIONSメソッドが正しく設定されているか確認

### 7.5 デバッグ方法

#### ブラウザ開発者ツールを使用

```javascript
// コンソールで実行してAWS設定を確認
console.log(window.AWS_CONFIG);

// ストレージマネージャーの状態を確認
console.log(window.StorageManager.getAllResults());
```

#### Lambda関数のログ確認

1. AWS CloudWatch → ロググループ
2. `/aws/lambda/ReviewToolUploadHandler` を開く
3. 最新のログストリームを確認

---

## 付録

### A. セキュリティのベストプラクティス

1. **APIキーの使用**: 必ずAPIキーを設定し、不正アクセスを防ぐ
2. **CORS設定の制限**: 本番環境では `Access-Control-Allow-Origin` を特定のドメインに制限
3. **IAM権限の最小化**: Lambda実行ロールには必要最小限の権限のみ付与
4. **S3バケットのパブリックアクセスブロック**: S3バケットは非公開に保つ

### B. コスト見積もり

一般的な使用量（月間1000レビュー）の場合：

- **S3**: $0.01〜$0.10（ストレージ + リクエスト）
- **Lambda**: $0.20〜$1.00（無料枠内で収まる可能性が高い）
- **API Gateway**: $0.35〜$3.50
- **合計**: 月額 $0.56〜$4.60

### C. バックアップ戦略

S3バージョニングを有効化してデータ保護：

```bash
aws s3api put-bucket-versioning \
  --bucket review-tool-results \
  --versioning-configuration Status=Enabled
```

### D. データのエクスポート

S3からすべてのレビューデータをダウンロード：

```bash
# AWS CLIを使用
aws s3 sync s3://review-tool-results/reviews/ ./local-backup/

# または特定の月のデータのみ
aws s3 sync s3://review-tool-results/reviews/2025/01/ ./local-backup/2025-01/
```

---

## まとめ

このガイドに従うことで、以下が実現できます：

1. GitHub Pagesでレビューツールを公開
2. レビュー結果を自動的にAWS S3に保存
3. セキュアなAPI経由でのデータ送信
4. スケーラブルなデータ管理

何か問題が発生した場合は、トラブルシューティングセクションを参照してください。
