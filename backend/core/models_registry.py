from backend.core.providers.manager import ProviderManager


class ModelRegistry:
    def __init__(self):
        self.provider_manager = ProviderManager()

    def list_models(self) -> dict:
        config = self.provider_manager.list_providers()
        providers = config.get("providers", {})

        all_models = []

        for provider_name, provider_config in providers.items():
            if not provider_config.get("enabled", False):
                continue

            result = self.provider_manager.list_provider_models(provider_name)

            if not result.get("success"):
                continue

            for model in result.get("models", []):
                all_models.append({
                    "name": model.get("name"),
                    "provider": provider_name,
                    "size": model.get("size"),
                    "modified_at": model.get("modified_at")
                })

        return {
            "success": True,
            "models": all_models
        }

    def find_provider_for_model(self, model_name: str) -> str | None:
        models = self.list_models().get("models", [])

        for model in models:
            if model.get("name") == model_name:
                return model.get("provider")

        return None
