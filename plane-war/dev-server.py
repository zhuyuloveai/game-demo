#!/usr/bin/env python3
"""开发用静态服务器：所有响应带 Cache-Control: no-store，刷新必拿最新文件。"""
import http.server
import functools


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=".")
    http.server.ThreadingHTTPServer(("127.0.0.1", 8000), handler).serve_forever()
