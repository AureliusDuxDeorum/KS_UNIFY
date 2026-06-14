import subprocess
from datetime import datetime

import requests


class ServiceManager:
    def __init__(self):
        self.services = {
            "backend": {
                "name": "backend",
                "description": "KS Unify FastAPI backend",
                "managed": False,
                "health_url": "internal"
            },
            "ollama": {
                "name": "ollama",
                "description": "Local Ollama model server",
                "managed": False,
                "health_url": "http://localhost:11434/api/tags"
            }
        }

    def check_http_service(self, url: str):
        if url == "internal":
            return "online"

        try:
            response = requests.get(url, timeout=3)

            if response.status_code == 200:
                return "online"

            return f"error_http_{response.status_code}"

        except Exception:
            return "offline"

    def list_services(self):
        result = {}

        for name, service in self.services.items():
            result[name] = {
                **service,
                "status": self.check_http_service(service["health_url"])
            }

        return {
            "success": True,
            "services": result
        }

    def get_service(self, service_name: str):
        service = self.services.get(service_name)

        if not service:
            return {
                "success": False,
                "error": "service not found"
            }

        return {
            "success": True,
            "service": {
                **service,
                "status": self.check_http_service(service["health_url"])
            }
        }

    def start_service(self, service_name: str):
        if service_name not in self.services:
            return {
                "success": False,
                "error": "service not found"
            }

        if service_name == "ollama":
            try:
                subprocess.Popen(
                    ["ollama", "serve"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )

                return {
                    "success": True,
                    "service": service_name,
                    "status": "starting",
                    "last_action": "start",
                    "last_updated": datetime.now().isoformat(timespec="seconds")
                }

            except Exception as e:
                return {
                    "success": False,
                    "service": service_name,
                    "error": str(e)
                }

        return {
            "success": False,
            "service": service_name,
            "error": "service cannot be started by manager yet"
        }

    def stop_service(self, service_name: str):
        if service_name not in self.services:
            return {
                "success": False,
                "error": "service not found"
            }

        if service_name == "ollama":
            try:
                subprocess.run(
                    ["pkill", "-f", "ollama"],
                    check=False
                )

                return {
                    "success": True,
                    "service": service_name,
                    "status": "stopping",
                    "last_action": "stop",
                    "last_updated": datetime.now().isoformat(timespec="seconds")
                }

            except Exception as e:
                return {
                    "success": False,
                    "service": service_name,
                    "error": str(e)
                }

        return {
            "success": False,
            "service": service_name,
            "error": "service cannot be stopped by manager yet"
        }

    def restart_service(self, service_name: str):
        stop_result = self.stop_service(service_name)

        if not stop_result.get("success"):
            return stop_result

        start_result = self.start_service(service_name)

        return {
            "success": start_result.get("success", False),
            "service": service_name,
            "status": "restarting",
            "stop": stop_result,
            "start": start_result
        }
