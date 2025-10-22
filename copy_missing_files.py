#!/usr/bin/env python3
import os
import shutil
from pathlib import Path

SOURCE_DIR = Path("/Users/obarayui/Desktop/Develop/ModelVistaPlus(sub)/model")
DEST_DIR = Path("/Users/obarayui/Git/ModelVistaPlus/model")
TARGET_FILES = ["req.md", "qa_new_ja.json", "qa_new_ja2.json"]

def get_dest_folder_name(source_folder_name):
    """SKIP_プレフィックスを除去してコピー先フォルダ名を取得"""
    if source_folder_name.startswith("SKIP_"):
        return source_folder_name[5:]  # "SKIP_"を削除
    elif source_folder_name.startswith("EDIT_"):
        # EDIT_プレフィックスのフォルダはスキップ
        return None
    return source_folder_name

def find_missing_files():
    """コピー元にあってコピー先にないファイルをリストアップ"""
    missing_files = []

    for source_folder in SOURCE_DIR.iterdir():
        if not source_folder.is_dir():
            continue

        dest_folder_name = get_dest_folder_name(source_folder.name)
        if dest_folder_name is None:
            # EDIT_フォルダなどスキップ対象
            continue
        dest_folder = DEST_DIR / dest_folder_name

        for filename in TARGET_FILES:
            source_file = source_folder / filename
            if source_file.exists():
                dest_file = dest_folder / filename
                if not dest_file.exists():
                    missing_files.append({
                        'source': source_file,
                        'dest': dest_file,
                        'source_folder': source_folder.name,
                        'dest_folder': dest_folder_name
                    })

    return missing_files

def copy_missing_files(missing_files, dry_run=True):
    """不足しているファイルをコピー"""
    if dry_run:
        print("=== DRY RUN: 以下のファイルがコピーされます ===\n")
        for item in missing_files:
            print(f"コピー元: {item['source_folder']}/{item['source'].name}")
            print(f"コピー先: {item['dest_folder']}/{item['dest'].name}")
            print()
        print(f"合計: {len(missing_files)} ファイル")
    else:
        print("=== ファイルをコピー中 ===\n")
        copied_count = 0
        for item in missing_files:
            dest_folder = item['dest'].parent
            dest_folder.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item['source'], item['dest'])
            print(f"✓ {item['source_folder']}/{item['source'].name} → {item['dest_folder']}/{item['dest'].name}")
            copied_count += 1
        print(f"\n合計 {copied_count} ファイルをコピーしました")

if __name__ == "__main__":
    import sys

    missing_files = find_missing_files()

    if not missing_files:
        print("コピーする必要があるファイルはありません。")
        sys.exit(0)

    # デフォルトはドライラン（確認のみ）
    dry_run = "--execute" not in sys.argv

    copy_missing_files(missing_files, dry_run=dry_run)

    if dry_run:
        print("\n実際にコピーを実行するには、--execute オプションを付けて実行してください：")
        print("python copy_missing_files.py --execute")
