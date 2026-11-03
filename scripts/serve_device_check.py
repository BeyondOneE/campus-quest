#!/usr/bin/env python3
"""Serve only hardware diagnostics. The shared treasure application uses npm start."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse

PUBLIC = Path(__file__).resolve().parents[1] / "public"
MIME = {"index.html": "text/html; charset=utf-8", "probe.js": "text/javascript; charset=utf-8",
        "measurements.js": "text/javascript; charset=utf-8", "style.css": "text/css; charset=utf-8",
        "app.js": "text/javascript; charset=utf-8", "model.js": "text/javascript; charset=utf-8"}
FILES = {"device-check": {"index.html", "probe.js", "measurements.js", "style.css"}}


def resolve_asset(path):
    if path in ("/", "/index.html", "/device-check/"):
        return "device-check", "index.html"
    for folder, names in FILES.items():
        prefix = f"/{folder}/"
        if path.startswith(prefix) and path[len(prefix):] in names:
            return folder, path[len(prefix):]
    # Preserve the diagnostic server's original root-level asset URLs.
    if path.removeprefix("/") in FILES["device-check"]:
        return "device-check", path.removeprefix("/")
    return None


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.serve_asset(send_body=True)

    def do_HEAD(self):
        self.serve_asset(send_body=False)

    def serve_asset(self, send_body):
        path = urlsplit(self.path).path
        if path == "/device-check":
            self.send_response(308)
            self.send_header("Location", path + "/")
            self.end_headers()
            return
        asset = resolve_asset(path)
        if asset is None:
            self.send_error(404)
            return
        folder, name = asset
        data = (PUBLIC / folder / name).read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", MIME[name])
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; connect-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
        self.send_header("Permissions-Policy", "camera=(self), microphone=(), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)")
        self.end_headers()
        if send_body:
            self.wfile.write(data)

    def log_message(self, *_):
        pass  # No request or client-address log; the page has no collection API.


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4174)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    port = server.server_address[1]
    print(f"Device diagnostics: http://127.0.0.1:{port}/device-check/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
