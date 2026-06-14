import sqlite3
from pathlib import Path

from backend.core.status import StatusManager
from backend.core.providers.manager import ProviderManager
from backend.core.models_registry import ModelRegistry
from backend.core.routing.router import Router
from backend.core.services.service_manager import ServiceManager


DB_PATH = Path("/home/prometheus/KS_UNIFY/configs/ks_unify.db")


class DashboardManager:
    def __init__(self):
        self.status_manager = StatusManager()
        self.provider_manager = ProviderManager()
        self.model_registry = ModelRegistry()
        self.router = Router()
        self.service_manager = ServiceManager()

    def get_chat_stats(self):
        total_chats = 0
        successful_chats = 0
        failed_chats = 0
        average_latency_ms = 0

        if DB_PATH.exists():
            with sqlite3.connect(DB_PATH) as conn:
                total_chats = conn.execute(
                    "SELECT COUNT(*) FROM chat_history"
                ).fetchone()[0]

                successful_chats = conn.execute(
                    "SELECT COUNT(*) FROM chat_history WHERE success = 1"
                ).fetchone()[0]

                failed_chats = conn.execute(
                    "SELECT COUNT(*) FROM chat_history WHERE success = 0"
                ).fetchone()[0]

                latency = conn.execute(
                    "SELECT AVG(latency_ms) FROM chat_history"
                ).fetchone()[0]

                average_latency_ms = round(latency or 0)

        success_rate = 0

        if total_chats > 0:
            success_rate = round(
                successful_chats / total_chats * 100,
                1
            )

        return {
            "total_chats": total_chats,
            "successful_chats": successful_chats,
            "failed_chats": failed_chats,
            "success_rate": success_rate,
            "average_latency_ms": average_latency_ms
        }

    def get_dashboard(self):
        status = self.status_manager.get_status()
        providers_config = self.provider_manager.list_providers().get("providers", {})
        models = self.model_registry.list_models().get("models", [])
        routing_rules = self.router.get_rules().get("rules", [])
        services = self.service_manager.list_services().get("services", {})
        chat_stats = self.get_chat_stats()

        provider_count = len(providers_config)
        enabled_provider_count = 0
        online_provider_count = 0

        for provider_data in status.get("providers", {}).values():
            if provider_data.get("enabled"):
                enabled_provider_count += 1

            if provider_data.get("status") == "online":
                online_provider_count += 1

        online_service_count = 0

        for service in services.values():
            if service.get("status") == "online":
                online_service_count += 1

        return {
            "success": True,
            "backend": "online",
            "summary": {
                "provider_count": provider_count,
                "enabled_provider_count": enabled_provider_count,
                "online_provider_count": online_provider_count,
                "model_count": len(models),
                "routing_rule_count": len(routing_rules),
                "service_count": len(services),
                "online_service_count": online_service_count
            },
            "stats": {
                **chat_stats,
                "configured_provider_count": provider_count,
                "enabled_provider_count": enabled_provider_count,
                "online_provider_count": online_provider_count,
                "model_count": len(models),
                "routing_rule_count": len(routing_rules),
                "service_count": len(services),
                "online_service_count": online_service_count
            },
            "providers": status.get("providers", {}),
            "services": services,
            "models": models,
            "routing_rules": routing_rules
        }
