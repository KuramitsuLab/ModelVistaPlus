#!/usr/bin/env python3
"""
JSONファイルシャッフルスクリプト
qa_all_1030.jsonを元に、選択肢をシャッフルしたqa_all_shuffle_1030.jsonを作成する
"""

import json
import random
from pathlib import Path
from typing import List, Dict, Any

def shuffle_question(question: Dict[str, Any]) -> Dict[str, Any]:
    """
    問題の選択肢をシャッフルし、correct_answerを削除する
    """
    shuffled_question = question.copy()

    # choice配列が存在する場合のみシャッフル
    if 'choice' in shuffled_question and isinstance(shuffled_question['choice'], list):
        shuffled_choice = shuffled_question['choice'].copy()
        random.shuffle(shuffled_choice)
        shuffled_question['choice'] = shuffled_choice

    # correct_answerを削除
    if 'correct_answer' in shuffled_question:
        del shuffled_question['correct_answer']

    return shuffled_question

def main():
    """
    メイン処理
    """
    input_file = Path('qa_all_1030.json')
    output_file = Path('qa_all_shuffle_1030.json')

    # 入力ファイルの存在確認
    if not input_file.exists():
        print(f"エラー: {input_file} が見つかりません。")
        return

    try:
        # 入力ファイルを読み込み
        print(f"読み込み中: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            questions = json.load(f)

        if not isinstance(questions, list):
            print(f"エラー: {input_file} は配列形式ではありません。")
            return

        print(f"問題数: {len(questions)}")

        # 各問題をシャッフル
        shuffled_questions = []
        for question in questions:
            shuffled_question = shuffle_question(question)
            shuffled_questions.append(shuffled_question)

        # 出力ファイルに書き込み
        print(f"書き込み中: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(shuffled_questions, f, ensure_ascii=False, indent=2)

        print(f"\n=== 処理完了 ===")
        print(f"入力ファイル: {input_file}")
        print(f"出力ファイル: {output_file}")
        print(f"シャッフルされた問題数: {len(shuffled_questions)}")

    except json.JSONDecodeError as e:
        print(f"エラー: {input_file} のJSON解析エラー: {e}")
    except Exception as e:
        print(f"エラー: 処理中にエラーが発生しました: {e}")

if __name__ == '__main__':
    main()
