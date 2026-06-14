from datetime import datetime
from pathlib import Path


LOG_DIR = Path("/home/prometheus/KS_UNIFY/logs")


class KSLogger:
    def __init__(self):
        LOG_DIR.mkdir(parents=True, exist_ok=True)

    def write(self, log_name: str, message: str):
        log_path = LOG_DIR / f"{log_name}.log"
        timestamp = datetime.now().isoformat(timespec="seconds")

        with log_path.open("a", encoding="utf-8") as file:
            file.write(f"[{timestamp}] {message}\n")

    def api(self, message: str):
        self.write("api", message)

    def provider(self, message: str):
        self.write("provider", message)

    def routing(self, message: str):
        self.write("routing", message)

    def service(self, message: str):
        self.write("service", message)

    def read(self, log_name: str, lines: int = 100):
        log_path = LOG_DIR / f"{log_name}.log"

        if not log_path.exists():
            return {
                "success": False,
                "log": log_name,
                "entries": [],
                "error": "log not found"
            }

        with log_path.open("r", encoding="utf-8") as file:
            entries = file.readlines()

        return {
            "success": True,
            "log": log_name,
            "entries": [entry.rstrip("\n") for entry in entries[-lines:]]
        }
