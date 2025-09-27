import os
import re

# パスの設定
drawingtool_dir = os.path.join(os.path.dirname(__file__), '..', 'images', 'drawingtool')
model_dir = os.path.join(os.path.dirname(__file__), '..', 'model')

# drawingtoolディレクトリ内のpngファイルを取得
png_files = [f for f in os.listdir(drawingtool_dir) if f.endswith('.png')]

for png_file in png_files:
    # ファイル名から名前部分を抽出（拡張子除去）
    name_part = os.path.splitext(png_file)[0]

    # 正規表現で activity_数字 の形式を変換
    match = re.match(r'([a-zA-Z]+)_(\d+)', name_part)
    if match:
        prefix = match.group(1)
        number = int(match.group(2))
        dir_name = f"{prefix}{number:03d}"
    else:
        dir_name = name_part  # マッチしない場合はそのまま

    # modelディレクトリ内に同名ディレクトリが存在するか確認
    target_dir = os.path.join(model_dir, dir_name)
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        print(f"Created directory: {target_dir}")