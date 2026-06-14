import json
from pathlib import Path

from backend.core.providers.ollama_provider import OllamaProvider
from backend.core.providers.ollama_cloud_provider import OllamaCloudProvider
from backend.core.providers.openai_provider import OpenAIProvider


CONFIG_PATH = Path("/home/prometheus/KS_UNIFY/configs/providers.json")


class ProviderManager:
    def __init__(self):
        self.config_path = CONFIG_PATH

    def load_config(self) -> dict:
        if not self.config_path.exists():
            return {"providers": {}}

        with self.config_path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def save_config(self, config: dict) -> None:
        with self.config_path.open("w", encoding="utf-8") as file:
            json.dump(config, file, indent=2)

    def list_providers(self) -> dict:
        return self.load_config()

    def get_provider_config(self, provider_name: str):
        config = self.load_config()
        return config.get("providers", {}).get(provider_name)

    def get_client(self, provider_name: str):
        provider = self.get_provider_config(provider_name)

        if not provider:
            return None

        if not provider.get("enabled", False):
            return None

        if provider_name == "ollama":
            return OllamaProvider(
                base_url=provider.get("base_url", "http://localhost:11434")
            )

        if provider_name == "ollama_cloud":
            api_key = provider.get("api_key", "")

            if not api_key:
                return None

            return OllamaCloudProvider(
                api_key=api_key,
                base_url=provider.get("base_url", "https://ollama.com")
            )

        if provider_name == "openai":
            api_key = provider.get("api_key", "")

            if not api_key:
                return None

            return OpenAIProvider(
                api_key=api_key,
                base_url=provider.get("base_url", "https://api.openai.com/v1")
            )

        return None

    def update_provider(
        self,
        provider_name: str,
        enabled: bool,
        api_key: str = "",
        base_url: str = ""
    ):
        config = self.load_config()

        if "providers" not in config:
            config["providers"] = {}

        existing = config["providers"].get(provider_name, {})

        config["providers"][provider_name] = {
            "enabled": enabled,
            "api_key": api_key or existing.get("api_key", ""),
            "base_url": base_url or existing.get("base_url", "")
        }

        self.save_config(config)

        return {
            "success": True,
            "status": "updated",
            "provider": provider_name,
            "enabled": enabled
        }

    def test_provider(self, provider_name: str):
        client = self.get_client(provider_name)

        if not client:
            return {
                "success": False,
                "provider": provider_name,
                "error": "provider not found, disabled, missing api key, or not implemented"
            }

        return client.test_connection()

    def list_provider_models(self, provider_name: str):
        client = self.get_client(provider_name)

        if not client:
            return {
                "success": False,
                "provider": provider_name,
                "models": [],
                "error": "provider not found, disabled, missing api key, or not implemented"
            }

        return client.list_models()

    def chat(
        self,
        provider_name: str,
        model: str,
        message: str
    ):
        client = self.get_client(provider_name)

        if not client:
            return {
                "success": False,
                "error": "provider not found, disabled, missing api key, or not implemented"
            }

        return client.chat(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": message
                }
            ]
        )

    def stream_chat(
        self,
        provider_name: str,
        model: str,
        message: str
    ):
        client = self.get_client(provider_name)

        if not client:
            yield "ERROR: provider not found, disabled, missing api key, or not implemented"
            return

        if not hasattr(client, "stream_chat"):
            yield "ERROR: streaming not implemented for this provider"
            return

        yield from client.stream_chat(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": message
                }
            ]
        )
