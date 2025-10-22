#!/usr/bin/env python3
"""
ベンチマーク問題レビューツール用HTTPサーバー
JSONファイルの保存機能付き
"""

import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs
import sys

PORT = 8000

class ReviewToolHandler(http.server.SimpleHTTPRequestHandler):
    """カスタムHTTPリクエストハンドラ"""

    def do_POST(self):
        """POSTリクエストの処理"""
        if self.path == '/save-json':
            self.handle_save_json()
        else:
            self.send_error(404, "Not Found")

    def handle_save_json(self):
        """JSONファイル保存処理"""
        try:
            # リクエストボディを読み込む
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))

            folder_name = request_data.get('folderName')
            filename = request_data.get('filename')
            data = request_data.get('data')

            if not folder_name or not filename or data is None:
                self.send_error(400, "Bad Request: Missing parameters")
                return

            # 保存先パスを構築
            model_dir = os.path.join(os.getcwd(), 'model', folder_name)

            # ディレクトリが存在することを確認
            if not os.path.exists(model_dir):
                self.send_error(404, f"Folder not found: model/{folder_name}")
                return

            file_path = os.path.join(model_dir, filename)

            # ファイルに書き込み
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(data)

            # 成功レスポンス
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            response = {
                'success': True,
                'message': f'File saved: {file_path}',
                'path': file_path
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

            print(f"✓ Saved: model/{folder_name}/{filename}")

        except Exception as e:
            print(f"✗ Error saving file: {e}", file=sys.stderr)
            self.send_error(500, f"Internal Server Error: {str(e)}")

    def do_OPTIONS(self):
        """OPTIONSリクエストの処理（CORS対応）"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def end_headers(self):
        """CORSヘッダーを追加"""
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()


def main():
    """サーバー起動"""
    with socketserver.TCPServer(("", PORT), ReviewToolHandler) as httpd:
        print("=" * 60)
        print("ベンチマーク問題レビューツール - ローカルサーバー")
        print("=" * 60)
        print(f"\nサーバーが起動しました: http://localhost:{PORT}")
        print(f"\nブラウザで以下のURLを開いてください:")
        print(f"  → http://localhost:{PORT}/src/index.html")
        print(f"\n終了するには Ctrl+C を押してください\n")
        print("=" * 60)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nサーバーを終了します...")
            sys.exit(0)


if __name__ == "__main__":
    main()
