#!/bin/bash

# ベンチマーク問題レビューツール用ローカルサーバー起動スクリプト

# Pythonのバージョンに応じてカスタムサーバーを起動
if command -v python3 &> /dev/null; then
    python3 server.py
elif command -v python &> /dev/null; then
    python server.py
else
    echo "エラー: Pythonがインストールされていません"
    exit 1
fi
