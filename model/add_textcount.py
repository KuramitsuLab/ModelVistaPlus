# -*- coding: utf-8 -*-
import os, json, re, sys, collections

# ===== 設定 =====
INPUT_JSON = "ModelVista_new20250927_edited.json"  # 図ごとの問題配列（ここから画像中の文字数を取る）
MODEL_ROOT = "/Users/obarayui/Git/ModelVistaPlus/model"                                # image.json があるルート
DRY_RUN    = False                                   # True: 変更内容だけ表示 / False: 実際に書き込み
TARGET_IDS = None                                   # 例: {"usecase001","class003"}  None=全image_id

# ===== 入力確認 =====
if not os.path.exists(INPUT_JSON):
    print(f"[ERROR] {INPUT_JSON} が見つかりません"); sys.exit(1)

# ===== 元データ読み込み（image_id -> 画像中の文字数）=====
with open(INPUT_JSON, "r", encoding="utf-8") as f:
    data = json.load(f)

if isinstance(data, dict):
    data = [data]
elif not isinstance(data, list):
    print("[ERROR] 入力JSONのトップは配列/オブジェクトである必要があります"); sys.exit(1)

# image_id ごとに最初に見つかった「画像中の文字数」を採用
textcount_by_image = collections.OrderedDict()
for it in data:
    img = (it.get("image_id") or "").strip()
    if not img:
        continue
    if img not in textcount_by_image and "画像中の文字数" in it:
        val = it["画像中の文字数"]
        # 数字っぽければ int に、それ以外は文字列のまま
        try:
            val = int(str(val).strip())
        except:
            val = str(val)
        textcount_by_image[img] = val

# ===== image_id ごとに image.json を処理 =====
png_key = re.compile(r".+\.png$", re.I)
ja_png_key = re.compile(r".+_ja\.png$", re.I)

updated, skipped_missing, filtered = 0, 0, 0

for image_id, tc in textcount_by_image.items():
    if TARGET_IDS is not None and image_id not in TARGET_IDS:
        filtered += 1
        continue

    image_json_path = os.path.join(MODEL_ROOT, image_id, "image.json")
    if not os.path.exists(image_json_path):
        print(f"[WARN] image.json なし: {image_json_path}")
        skipped_missing += 1
        continue

    with open(image_json_path, "r", encoding="utf-8") as rf:
        try:
            meta = json.load(rf)
        except Exception as e:
            print(f"[ERROR] JSON読込失敗: {image_json_path} -> {e}")
            continue

    before = json.dumps(meta, ensure_ascii=False)

    # *.png セクションに text_count を追加
    # - *_ja.png は text_count = tc（画像中の文字数）
    # - それ以外の *.png は、text_count が未設定なら 0 を追加（既存あれば尊重）
    changed = False
    for k in list(meta.keys()):
        if not isinstance(meta.get(k), dict):
            continue
        if not png_key.match(k):
            continue

        section = meta[k]
        # 末尾に追加されるように（Python3.7+は挿入順保持）再構築
        # 既存の順序を保ちつつ最後に text_count を入れる
        if ja_png_key.match(k):
            new_tc = tc
            # 既に text_count があっても *_ja.png は上書きしたい指示なので上書き
            if section.get("text_count") != new_tc:
                section["text_count"] = new_tc
                changed = True
        else:
            if "text_count" not in section:
                section["text_count"] = 0
                changed = True
        meta[k] = section

    after = json.dumps(meta, ensure_ascii=False)

    if before == after:
        print(f"[NO-CHANGE] {image_json_path}")
    else:
        if DRY_RUN:
            print(f"[DRY-RUN] {image_json_path} を更新予定（{image_id}）")
            # ログの例示（*_ja.png の反映値）
            for k in meta.keys():
                if ja_png_key.match(k):
                    print(f"          {k}.text_count = {meta[k].get('text_count')}")
        else:
            try:
                with open(image_json_path, "w", encoding="utf-8") as wf:
                    json.dump(meta, wf, ensure_ascii=False, indent=2)
                print(f"[WRITE] {image_json_path}")
                updated += 1
            except Exception as e:
                print(f"[ERROR] 書込失敗: {image_json_path} -> {e}")

print("\n===== 結果 =====")
print(f"更新(WRITE想定/実施): {updated} 件")
print(f"image.json 不在: {skipped_missing} 件")
print(f"フィルタ対象外: {filtered} 件")
print(f"DRY_RUN = {DRY_RUN}")
print("最初は DRY_RUN=True / TARGET_IDS={'usecase001'} などで部分確認 → 問題なければ全体実行")
