import json
import requests

from backend.core.providers.base import BaseProvider


class OllamaProvider(BaseProvider):
    def __init__(self, base_url: str = "http://localhost:11434"):
        super().__init__(
            name="ollama",
            base_url=base_url
        )

    def test_connection(self) -> dict:
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=5
            )

            return {
                "success": response.status_code == 200,
                "provider": "ollama",
                "status": "online" if response.status_code == 200 else "offline"
            }

        except Exception as e:
            return {
                "success": False,
                "provider": "ollama",
                "error": str(e)
            }

    def list_models(self) -> dict:
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=5
            )

            data = response.json()

            models = []

            for model in data.get("models", []):
                models.append({
                    "name": model.get("name"),
                    "size": model.get("size"),
                    "modified_at": model.get("modified_at")
                })

            return {
                "success": True,
                "provider": "ollama",
                "models": models
            }

        except Exception as e:
            return {
                "success": False,
                "provider": "ollama",
                "models": [],
                "error": str(e)
            }

    def chat(self, model: str, messages: list[dict]) -> dict:
        try:
            prompt = messages[-1]["content"]

            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=300
            )

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
            json={
                "model": model,
                "prompt": prompt,
                "stream": True
            },
            stream=True,
            timeout=300
        )

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
