import time
from datetime import datetime

from backend.core.providers.manager import ProviderManager
from backend.core.models_registry import ModelRegistry
from backend.core.routing.router import Router
from backend.core.services.service_manager import ServiceManager


class StatusManager:
    def __init__(self):
        self.provider_manager = ProviderManager()
        self.model_registry = ModelRegistry()
        self.router = Router()
        self.service_manager = ServiceManager()

    def get_status(self):
        provider_config = self.provider_manager.list_providers()
        providers = provider_config.get("providers", {})

        provider_status = {}

        for provider_name, config in providers.items():
            checked_at = datetime.now().isoformat(timespec="seconds")

            if not config.get("enabled", False):
                provider_status[provider_name] = {
                    "enabled": False,
                    "status": "disabled",
                    "latency_ms": None,
                    "last_checked": checked_at,
                    "details": {
                        "success": False,
                        "message": "provider disabled"
                    }
                }
                continue

            start = time.time()
            result = self.provider_manager.test_provider(provider_name)
            latency_ms = int((time.time() - start) * 1000)

            provider_status[provider_name] = {
                "enabled": True,
                "status": "online" if result.get("success") else "error",
                "latency_ms": latency_ms,
                "last_checked": checked_at,
                "details": result
            }

        models_result = self.model_registry.list_models()
        routing_rules = self.router.get_rules().get("rules", [])
        services_result = self.service_manager.list_services()

        return {
            "success": True,
            "backend": "online",
            "providers": provider_status,
            "model_count": len(models_result.get("models", [])),
            "routing_rule_count": len(routing_rules),
            "services": services_result.get("services", {})
        }
