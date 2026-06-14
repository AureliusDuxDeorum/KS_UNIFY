import socket


class NetworkInfo:
    def get_lan_ip(self):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
            sock.close()
            return ip
        except Exception:
            return "127.0.0.1"

    def get_info(self, port: int = 8000):
        lan_ip = self.get_lan_ip()

        return {
            "success": True,
            "lan_ip": lan_ip,
            "local_url": f"http://localhost:{port}",
            "lan_url": f"http://{lan_ip}:{port}",
            "host_for_lan": "0.0.0.0"
        }
