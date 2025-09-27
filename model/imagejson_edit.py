# -*- coding: utf-8 -*-
import os, re, json, sys, collections

# ===== 設定 =====
INPUT_JSON   = "ModelVista_new20250927_edited.json"  # 問題配列の元データ
MODEL_ROOT   = "/Users/obarayui/Git/ModelVistaPlus/model"  # 各 image_id フォルダの親
DRY_RUN      = False                                   # True: 書き込みせず予定だけ表示 / False: 実際に上書き
TARGET_IDS   = None                                   # 例: {"usecase001", "class003"}  # None なら全 image_id 対象

# 画像IDから種別タグ("usecase","class","object","sequence" 等)を推定する関数(簡易)
# 例: usecase001 -> usecase, class003 -> class
kind_from_image_id = lambda s: re.match(r"[A-Za-z]+", s).group(0) if re.match(r"[A-Za-z]+", s) else s

# ===== 入力チェック =====
if not os.path.exists(INPUT_JSON):
    print(f"[ERROR] 入力ファイルが見つかりません: {INPUT_JSON}")
    sys.exit(1)

# ===== 元JSONの読み込み =====
with open(INPUT_JSON, "r", encoding="utf-8") as f:
    data = json.load(f)

# data は配列である想定。dict の場合は単一要素配列にする
if isinstance(data, dict):
    data = [data]
elif not isinstance(data, list):
    print("[ERROR] 入力JSONのトップレベルは配列またはオブジェクトである必要があります。")
    sys.exit(1)

# ===== image_id ごとにグルーピング（登場順維持）=====
by_image = collections.OrderedDict()
for item in data:
    img = (item.get("image_id") or "").strip()
    if not img:
        continue
    by_image.setdefault(img, []).append(item)

# ===== 各 image_id ごとに、image.json を更新 =====
updated, skipped_missing, skipped_filter = 0, 0, 0

for image_id, items in by_image.items():
    if TARGET_IDS is not None and image_id not in TARGET_IDS:
        skipped_filter += 1
        continue

    img_dir = os.path.join(MODEL_ROOT, image_id)
    image_json_path = os.path.join(img_dir, "image.json")
    if not os.path.exists(image_json_path):
        print(f"[WARN] image.json が見つかりません。スキップ: {image_json_path}")
        skipped_missing += 1
        continue

    # 同一 image_id の問題群から代表値を取得（通常「図表の特徴」「構成要素数」「関連要素数」は同じ想定）
    # 最初に見つかった値を採用
    features_text = None
    elements_cnt  = None
    rels_cnt      = None

    for it in items:
        if features_text is None and "図表の特徴" in it:
            features_text = it["図表の特徴"]
        if elements_cnt is None and "構成要素数" in it:
            elements_cnt = str(it["構成要素数"])
        if rels_cnt is None and "関連要素数" in it:
            rels_cnt = str(it["関連要素数"])
        # すべて埋まったら打ち切り
        if features_text is not None and elements_cnt is not None and rels_cnt is not None:
            break

    # 読み込み
    with open(image_json_path, "r", encoding="utf-8") as rf:
        try:
            imgmeta = json.load(rf)
        except Exception as e:
            print(f"[ERROR] JSON読込に失敗: {image_json_path} -> {e}")
            continue

    # ==== 変更内容を作成 ====
    before = json.dumps(imgmeta, ensure_ascii=False, sort_keys=True)

    # 1) tag の2番目に図種別を設定（なければ ["", <kind>] に）
    kind = kind_from_image_id(image_id).lower()
    tags = imgmeta.get("tag", [])
    if not isinstance(tags, list):
        tags = []

    if len(tags) == 0:
        tags = [""]
    if len(tags) == 1:
        tags = [tags[0], kind]
    else:
        tags[1] = kind
    imgmeta["tag"] = tags

    # 2) features に「図表の特徴」を反映（あれば）
    if features_text is not None:
        imgmeta["features"] = features_text

    # 3) overview_counts を反映（文字列の数字で格納する指定）
    #    NOTE: overview_counts の型に合わせて文字列で格納します
    if "overview_counts" not in imgmeta or not isinstance(imgmeta["overview_counts"], dict):
        imgmeta["overview_counts"] = {"entities": "0", "relationships": "0"}

    if elements_cnt is not None:
        imgmeta["overview_counts"]["entities"] = str(elements_cnt)
    if rels_cnt is not None:
        imgmeta["overview_counts"]["relationships"] = str(rels_cnt)

    after = json.dumps(imgmeta, ensure_ascii=False, sort_keys=True)

    # 変更差分の有無
    if before == after:
        print(f"[NO-CHANGE] {image_json_path}")
    else:
        if DRY_RUN:
            print(f"[DRY-RUN] 更新予定: {image_json_path}")
            # 差分のヒント
            print(f"          tag: {tags}")
            if features_text is not None:
                print(f"          features: {features_text[:60]}{'...' if len(features_text)>60 else ''}")
            print(f"          overview_counts: {imgmeta['overview_counts']}")
        else:
            try:
                with open(image_json_path, "w", encoding="utf-8") as wf:
                    json.dump(imgmeta, wf, ensure_ascii=False, indent=2)
                print(f"[WRITE] {image_json_path}")
                updated += 1
            except Exception as e:
                print(f"[ERROR] 書き込み失敗: {image_json_path} -> {e}")

print("\n===== 結果 =====")
print(f"更新(WRITE想定/実施): {updated} 件")
print(f"image.json 不在でスキップ: {skipped_missing} 件")
print(f"フィルタ対象外でスキップ: {skipped_filter} 件")
print(f"DRY_RUN = {DRY_RUN}")
print("================================")
print("安全に進めるコツ: 最初は DRY_RUN=True & TARGET_IDS={'usecase001'} などで部分確認 → OKなら DRY_RUN=False")
