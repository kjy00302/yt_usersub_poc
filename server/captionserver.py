#!/usr/bin/env python3
# https://stackoverflow.com/a/21957017
from http.server import HTTPServer, SimpleHTTPRequestHandler, test
import sys


class CORSRequestHandler (SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "x-goog-visitor-id,x-youtube-ad-signals,x-youtube-client-name,x-youtube-client-version,x-youtube-device,x-youtube-page-cl,x-youtube-page-label,x-youtube-time-zone,x-youtube-utc-offset")
        self.end_headers()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        SimpleHTTPRequestHandler.end_headers(self)


if __name__ == '__main__':
    test(CORSRequestHandler, HTTPServer, port=int(sys.argv[1]) if len(sys.argv) > 1 else 8000)
