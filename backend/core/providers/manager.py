import json
import urllib.request
from pathlib import Path


CONFIG_PATH = Path("/home/prometheus/KS_UNIFY/configs/providers.json")


DEFAULT_PROVIDERS = {
    "ollama": {
        "enabled": True,
        "api_key": "",
        "base_url": "http://localhost:11434"
    },
    "ollama_cloud": {
        "enabled": False,
        "api_key": "",
        "base_url": "https://ollama.com"
    },
    "openai": {
        "enabled": False,
        "api_key": "",
        "base_url": "https://api.openai.com/v1"
    },
    "anthropic": {
        "enabled": False,
        "api_key": "",
        "base_url": "https://api.anthropic.com"
    },
    "google": {
        "enabled": False,
        "api_key": "",
        "base_url": "https://generativelanguage.googleapis.com"
    }
}


class ProviderManager:
    def __init__(self):
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        self.ensure_defaults()

    def load_raw(self):
        if not CONFIG_PATH.exists():
            return {"providers": {}}

        try:
            with CONFIG_PATH.open("r", encoding="utf-8") as file:
                data = json.load(file)
        except Exception:
            return {"providers": {}}

        if not isinstance(data, dict):
            return {"providers": {}}

        if "providers" not in data or not isinstance(data["providers"], dict):
            data["providers"] = {}

        return data

    def save_raw(self, data):
        with CONFIG_PATH.open("w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)

    def ensure_defaults(self):
        data = self.load_raw()
        providers = data.get("providers", {})
        changed = False

        for name, defaults in DEFAULT_PROVIDERS.items():
            if name not in providers:
                providers[name] = dict(defaults)
                changed = True
            else:
                for key, value in defaults.items():
                    if key not in providers[name]:
                        providers[name][key] = value
                        changed = True

        data["providers"] = providers

        if changed or not CONFIG_PATH.exists():
            self.save_raw(data)

        return data

    def list_providers(self):
        return self.ensure_defaults()

    def update_provider(self, provider_name, provider_data):
        data = self.ensure_defaults()
        providers = data.get("providers", {})

        current = providers.get(provider_name, {})
        current.update(provider_data)

        providers[provider_name] = current
        data["providers"] = providers

        self.save_raw(data)

        return {
            "success": True,
            "provider": provider_name,
            "data": current
        }

    def test_provider(self, provider_name):
        data = self.ensure_defaults()
        provider = data.get("providers", {}).get(provider_name)

        if not provider:
            return {
                "success": False,
                "error": "provider not found"
            }

        if not provider.get("enabled", False):
            return {
                "success": False,
                "status": "disabled",
                "error": "provider disabled"
            }

        if provider_name == "ollama":
            base_url = provider.get("base_url") or "http://localhost:11434"

            try:
                with urllib.request.urlopen(
                    f"{base_url}/api/tags",
                    timeout=3
                ) as response:
                    online = response.status == 200

                    return {
                        "success": online,
                        "status": "online" if online else "error",
                        "url": f"{base_url}/api/tags"
                    }

            except Exception as error:
                return {
                    "success": False,
                    "status": "offline",
                    "error": str(error)
                }

        if provider.get("api_key"):
            return {
                "success": True,
                "status": "configured"
            }

        return {
            "success": False,
            "status": "missing_api_key",
            "error": "API key not configured"
        }
