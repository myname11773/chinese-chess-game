#!/usr/bin/env python3
"""
象棋本地服务器
单线程 Pikafish WASM 不需要 SharedArrayBuffer/COOP/COEP
支持 gzip 压缩传输 + 长期缓存
"""

import http.server
import sys
import os
import gzip
import io

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

# 需要长期缓存的文件（引擎文件很大，缓存后二次访问秒开）
CACHE_LONG = {'.wasm', '.data', '.m4a', '.js', '.css', '.png', '.jpg', '.woff2'}
# 可以 gzip 压缩的文件类型
GZIP_TYPES = {'.js', '.css', '.html', '.json', '.svg', '.txt'}


class ChessHandler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        if path.endswith('.js'):
            return 'text/javascript; charset=utf-8'
        if path.endswith('.wasm'):
            return 'application/wasm'
        if path.endswith('.m4a'):
            return 'audio/mp4'
        return super().guess_type(path)

    def end_headers(self):
        # 为大文件添加长期缓存头
        ext = os.path.splitext(self.path)[1].lower()
        if ext in CACHE_LONG:
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        super().end_headers()

    def do_GET(self):
        # 检查是否支持 gzip 且文件类型适合压缩
        ext = os.path.splitext(self.path)[1].lower()
        accept_encoding = self.headers.get('Accept-Encoding', '')

        if ext in GZIP_TYPES and 'gzip' in accept_encoding:
            # 读取文件并 gzip 压缩
            fs = os.fspath(self.directory)
            file_path = self.translate_path(self.path)
            if file_path and os.path.isfile(file_path):
                with open(file_path, 'rb') as f:
                    content = f.read()
                compressed = gzip.compress(content)
                # 只在压缩有效时使用
                if len(compressed) < len(content):
                    self.send_response(200)
                    self.send_header('Content-Type', self.guess_type(self.path))
                    self.send_header('Content-Encoding', 'gzip')
                    self.send_header('Content-Length', str(len(compressed)))
                    if ext in CACHE_LONG:
                        self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
                    self.end_headers()
                    self.wfile.write(compressed)
                    return
        super().do_GET()


class ChessServer(http.server.HTTPServer):
    allow_reuse_address = True


def main():
    handler = ChessHandler
    handler.directory = '.'

    with ChessServer(('0.0.0.0', PORT), handler) as httpd:
        print(f'象棋服务器已启动: http://localhost:{PORT}')
        print(f'支持 gzip 压缩 + 长期缓存')
        print(f'按 Ctrl+C 停止')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n服务器已停止')
            sys.exit(0)


if __name__ == '__main__':
    main()
