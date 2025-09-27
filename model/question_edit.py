# -*- coding: utf-8 -*-
import os, json, collections, sys

# ===== 設定（必要に応じて変更）=====
INPUT_JSON  = "ModelVista_new20250927_edited.json"  # 入力元
OUTPUT_ROOT = "/Users/obarayui/Git/ModelVistaPlus/model"                               # 出力先のルート（model/<image_id>/questionNNN_ja.json）
OVERWRITE   = False                                  # 既存ファイルがある場合に上書きするか（False=スキップ, True=上書き）

# ===== 入力チェック =====
if not os.path.exists(INPUT_JSON):
    print(f"[ERROR] 入力ファイルが見つかりません: {INPUT_JSON}")
    sys.exit(1)

# ===== JSON 読み込み =====
with open(INPUT_JSON, "r", encoding="utf-8") as f:
    data = json.load(f)

# data が配列でなければ配列に正規化
if isinstance(data, dict):
    data = [data]
elif not isinstance(data, list):
    print("[ERROR] JSON のトップレベルは配列 or オブジェクトである必要があります。")
    sys.exit(1)

# ===== image_id ごとに出現順でグループ化 =====
by_image = collections.OrderedDict()
for i, item in enumerate(data):
    img = (item.get("image_id") or "").strip()
    if not img:
        print(f"[WARN] {i} 番目の要素に image_id がありません。スキップします。")
        continue
    by_image.setdefault(img, []).append(item)

# ===== 書き出し =====
os.makedirs(OUTPUT_ROOT, exist_ok=True)
total_written, total_skipped = 0, 0

for image_id, items in by_image.items():
    out_dir = os.path.join(OUTPUT_ROOT, image_id)
    os.makedirs(out_dir, exist_ok=True)

    # 各 image_id 内で 001, 002, ... と連番（登場順）
    idx = 1
    for item in items:
        # 出力オブジェクトの整形（要件どおり）
        out_obj = {
            "tag": "",
            "type": item.get("type", ""),
            "question": item.get("question", ""),
            "answer": item.get("answer", ""),
            "choice": item.get("choice", []) if isinstance(item.get("choice"), list) else [],
            "authored_by": "human",
            "is_translated": False
        }

        # ファイル名（questionNNN_ja.json）
        fname = f"question{idx:03d}_ja.json"
        out_path = os.path.join(out_dir, fname)

        # 既存処理
        if os.path.exists(out_path) and not OVERWRITE:
            print(f"[SKIP] 既存のためスキップ: {out_path}")
            total_skipped += 1
        else:
            with open(out_path, "w", encoding="utf-8") as wf:
                json.dump(out_obj, wf, ensure_ascii=False, indent=2)
            print(f"[WRITE] {out_path}")
            total_written += 1

        idx += 1

print(f"\n[DONE] 書き出し: {total_written} 件, スキップ: {total_skipped} 件, 出力ルート: {OUTPUT_ROOT}")
