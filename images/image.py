import os
import re

# drawingtoolフォルダのパス
folder_path = os.path.join(os.path.dirname(__file__), 'whiteboard')

# 拡張子を動的に取得するようにパターンを修正
pattern = re.compile(r'^(.*)_(\d+)\.(\w+)$')
for filename in os.listdir(folder_path):
    match = pattern.match(filename)
    if match:
        name, num, ext = match.groups()
        new_filename = f"{name}{int(num):03d}.{ext}"
        old_path = os.path.join(folder_path, filename)
        new_path = os.path.join(folder_path, new_filename)
        os.rename(old_path, new_path)
        print(f"Renamed: {filename} -> {new_filename}")