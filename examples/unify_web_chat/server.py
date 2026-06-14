from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os


ROOT = Path(__file__).parent
PORT = 5177


def main():
    os.chdir(ROOT)

    server = ThreadingHTTPServer(
        ("localhost", PORT),
        SimpleHTTPRequestHandler
    )

    print(f"KS Unify Web Chat Test running at http://localhost:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
