#!/usr/bin/env python3
"""
JSONファイル統合スクリプト
model/フォルダ内の各サブフォルダにあるJSONファイルを1つのファイルに統合する
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any

# 対象ファイル名
TARGET_FILES = ['qa_new_ja.json', 'qa_new_ja2.json', 'qa_old_ja.json']

def generate_question_id(folder_name: str, file_name: str, index: int) -> str:
    """
    一意のIDを生成する
    形式: {フォルダ名}_{ファイル名(拡張子なし)}_{3桁連番}
    """
    file_name_without_ext = Path(file_name).stem
    return f"{folder_name}_{file_name_without_ext}_{index:03d}"

def process_json_file(folder_path: Path, folder_name: str, file_name: str) -> List[Dict[str, Any]]:
    """
    JSONファイルを読み込んで処理する
    """
    file_path = folder_path / file_name
    processed_questions = []

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            questions = json.load(f)

        if not isinstance(questions, list):
            print(f"警告: {file_path} は配列形式ではありません。スキップします。")
            return []

        for idx, question in enumerate(questions, start=1):
            # 新しいフィールドを追加
            processed_question = question.copy()
            processed_question['id'] = generate_question_id(folder_name, file_name, idx)
            processed_question['source_folder'] = folder_name
            processed_question['source_file'] = file_name

            # correct_answerを追加（choiceの最初の要素）
            if 'choice' in question and isinstance(question['choice'], list) and len(question['choice']) > 0:
                processed_question['correct_answer'] = question['choice'][0]
            else:
                print(f"警告: {file_path} の問題 {idx} にchoiceが存在しないか空です。")
                processed_question['correct_answer'] = None

            processed_questions.append(processed_question)

        print(f"処理完了: {file_path} ({len(processed_questions)}問)")

    except FileNotFoundError:
        # ファイルが存在しない場合はスキップ（エラーではない）
        pass
    except json.JSONDecodeError as e:
        print(f"警告: {file_path} のJSON解析エラー: {e}")
    except Exception as e:
        print(f"警告: {file_path} の処理中にエラーが発生: {e}")

    return processed_questions

def main():
    """
    メイン処理
    """
    # model/フォルダのパス
    model_dir = Path('model')

    if not model_dir.exists() or not model_dir.is_dir():
        print(f"エラー: {model_dir} が見つかりません。")
        return

    all_questions = []
    processed_folders = 0
    processed_files = 0

    # model/フォルダ内の全サブフォルダを走査
    for folder_path in sorted(model_dir.iterdir()):
        if not folder_path.is_dir():
            continue

        folder_name = folder_path.name
        folder_has_files = False

        # 対象ファイルを処理
        for file_name in TARGET_FILES:
            file_path = folder_path / file_name

            if file_path.exists():
                questions = process_json_file(folder_path, folder_name, file_name)
                all_questions.extend(questions)
                processed_files += 1
                folder_has_files = True

        if folder_has_files:
            processed_folders += 1

    # 統合結果を出力
    output_file = Path('qa_all_1030.json')

    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_questions, f, ensure_ascii=False, indent=2)

        print(f"\n=== 処理完了 ===")
        print(f"処理フォルダ数: {processed_folders}")
        print(f"処理ファイル数: {processed_files}")
        print(f"統合問題数: {len(all_questions)}")
        print(f"出力ファイル: {output_file}")

    except Exception as e:
        print(f"エラー: 出力ファイルの書き込みに失敗しました: {e}")

if __name__ == '__main__':
    main()
