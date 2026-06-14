import json
import requests

from backend.core.providers.base import BaseProvider


DEFAULT_CLOUD_MODELS = [
    "gpt-oss:20b-cloud",
    "gpt-oss:120b-cloud",
    "deepseek-v3.1:671b-cloud",
    "qwen3-coder:480b-cloud"
]


class OllamaCloudProvider(BaseProvider):
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://ollama.com"
    ):
        super().__init__(
            name="ollama_cloud",
            api_key=api_key,
            base_url=base_url.rstrip("/")
        )

    def headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def test_connection(self) -> dict:
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                headers=self.headers(),
                json={
                    "model": "gpt-oss:20b-cloud",
                    "prompt": "Reply with OK",
                    "stream": False
                },
                timeout=60
            )

            return {
                "success": response.status_code == 200,
                "provider": "ollama_cloud",
                "status": "online" if response.status_code == 200 else "error",
                "http_status": response.status_code
            }

        except Exception as e:
            return {
                "success": False,
                "provider": "ollama_cloud",
                "status": "offline",
                "error": str(e)
            }

    def list_models(self) -> dict:
        return {
            "success": True,
            "provider": "ollama_cloud",
            "models": [
                {
                    "name": model,
                    "size": None,
                    "modified_at": None
                }
                for model in DEFAULT_CLOUD_MODELS
            ]
        }

    def chat(self, model: str, messages: list[dict]) -> dict:
        try:
            prompt = messages[-1]["content"]

            response = requests.post(
                f"{self.base_url}/api/generate",
                headers=self.headers(),
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=300
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"http_{response.status_code}: {response.text}"
                }

            data = response.json()

            return {
                "success": True,
                "response": data.get("response", "")
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def stream_chat(self, model: str, messages: list[dict]):
        prompt = messages[-1]["content"]

        response = requests.post(
            f"{self.base_url}/api/generate",
            headers=self.headers(),
            json={
                "model": model,
                "prompt": prompt,
                "stream": True
            },
            stream=True,
            timeout=300
        )

        if response.status_code != 200:
            yield f"ERROR: http_{response.status_code}: {response.text}"
            return

        for line in response.iter_lines():
            if not line:
                continue

            try:
                data = json.loads(line.decode("utf-8"))
                token = data.get("response", "")

                if token:
                    yield token

                if data.get("done", False):
                    break

            except Exception:
                continue
