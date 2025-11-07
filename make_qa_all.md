# 問題ファイル統合タスク

## 目的
`model/`フォルダ内の各サブフォルダにあるJSONファイルを1つの`qa_all_1030.json`ファイルに統合する

## 対象フォルダ構造
```
model/
├─ activity001/
│  ├─ dgpowerpoint_ja-fs8.png
│  ├─ qa_new_ja.json ← 対象
│  ├─ qa_new_ja2.json ← 対象（存在する場合）
│  └─ qa_old_ja.json ← 対象
├─ activity002/
├─ class001/
└─ class002/
```

**対象ファイル（この3つのみ）**:
- `qa_new_ja.json`
- `qa_new_ja2.json`
- `qa_old_ja.json`

**注意**: 上記以外の名前のファイルは全て無視する

## 出力ファイル
`qa_all_1030.json` (modelフォルダと同じ階層に作成)

## 出力JSON形式
```json
{
  "id": "activity001_qa_new_ja_001",
  "source_folder": "activity001",
  "source_file": "qa_new_ja.json",
  "tag": "依存関係",
  "question": "「入力内容の確認表示」処理が実行されるために、直前に必ず完了していなければならない処理はどれか？",
  "choice": [
    "PC利用登録内容を入力",
    "問い合わせ種別メニューの表示",
    "チケットを保存し受付メールを送信",
    "依頼先情報を入力してチケットを確定"
  ],
  "correct_answer": "PC利用登録内容を入力",
  "authored_by": "claude",
  "is_translated": false
}
```

## 処理要件

### 1. IDの生成ルール
- 形式: `{フォルダ名}_{ファイル名(拡張子なし)}_{3桁連番}`
- 例: `activity001_qa_new_ja_001`, `class002_qa_old_ja_015`
- 各ファイル内で001から開始し、連番を付与

### 2. フィールドの追加
元のJSONデータに以下のフィールドを追加：
- `id`: 上記ルールで生成した一意のID
- `source_folder`: 元のフォルダ名
- `source_file`: 元のファイル名（拡張子付き）
- `correct_answer`: choiceの最初の要素（正解）

### 3. 処理手順
1. `model/`フォルダ内の全サブフォルダを走査
2. 各フォルダ内の以下の3つのファイルのみを検出:
   - `qa_new_ja.json`
   - `qa_new_ja2.json`
   - `qa_old_ja.json`
   - それ以外のファイルはスルー
3. 検出された各JSONファイルを読み込み、配列として処理
4. 各問題に対して：
   - 一意のIDを生成
   - `source_folder`と`source_file`を追加
   - `correct_answer`を`choice[0]`から抽出して追加
   - 元のフィールドは全て保持
5. 全ての問題を1つの配列に統合
6. `qa_all_1030.json`として出力

### 4. エラーハンドリング
- 対象ファイル（`qa_new_ja.json`, `qa_new_ja2.json`, `qa_old_ja.json`）が存在しない場合はスキップ
- JSONのパースエラーが発生した場合は警告を表示して続行
- その他のファイル（画像ファイル等、対象外のJSONファイル）は無視

### 5. 実行方法
Pythonスクリプトを作成して実行してください。

## 注意事項
- 元のJSONファイルは変更しない
- choice配列の順序は維持する（最初の要素が正解）
- 既存のフィールド（tag, question, choice, authored_by, is_translated等）は全て保持
- UTF-8エンコーディングで処理

---

## 追加タスク: シャッフル版の作成

### 目的
`qa_all_1030.json`を元に、選択肢をシャッフルした`qa_all_shuffle_1030.json`を作成する

### 処理要件

#### 1. 入力ファイル
`qa_all_1030.json`

#### 2. 出力ファイル
`qa_all_shuffle_1030.json`

#### 3. シャッフル処理
各問題に対して：
- `choice`配列の要素をランダムにシャッフル
- `correct_answer`フィールドは削除する
- その他のフィールド（id, source_folder, source_file, tag, question, authored_by, is_translated等）は全て保持

#### 4. 実装例
```python
import random

# 各問題に対して
shuffled_choice = question["choice"].copy()
random.shuffle(shuffled_choice)
question["choice"] = shuffled_choice

# correct_answerを削除
if "correct_answer" in question:
    del question["correct_answer"]
```

#### 5. 注意事項
- 元の`qa_all_1030.json`は変更しない
- シャッフルはランダムなので、実行するたびに結果が変わる
- シャッフル版では正解がどれかは分からない（`correct_answer`が無いため）
- 正解を確認したい場合は元の`qa_all_1030.json`を参照する