#!/usr/bin/env python3
"""
Simple HTTP Server for Dashboard Personal
Run: python3 server.py
"""

import http.server
import socketserver
import webbrowser
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print("Dashboard Personal")
    print(f"   http://localhost:{PORT}")
    print(f"   http://127.0.0.1:{PORT}")
    print("\nPress Ctrl+C to stop\n")
    
    webbrowser.open(f"http://localhost:{PORT}")
    httpd.serve_forever()
