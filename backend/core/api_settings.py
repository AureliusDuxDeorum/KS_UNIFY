import json
from pathlib import Path


CONFIG_PATH = Path(
    "/home/prometheus/KS_UNIFY/configs/api_settings.json"
)


class APISettings:
    def load(self):
        if not CONFIG_PATH.exists():
            return {
                "host": "localhost",
                "port": 8000
            }

        with CONFIG_PATH.open("r", encoding="utf-8") as file:
            return json.load(file)

    def save(self, data):
        with CONFIG_PATH.open("w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)

        return {
            "success": True
        }

    def get_base_url(self):
        data = self.load()

        return {
            **data,
            "base_url": f"http://{data['host']}:{data['port']}"
        }
