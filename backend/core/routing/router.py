import json
from pathlib import Path

from backend.models.routing_rule import RoutingRule


RULES_PATH = Path(
    "/home/prometheus/KS_UNIFY/configs/routing_rules.json"
)


class Router:
    def load_rules(self):
        if not RULES_PATH.exists():
            return {"rules": []}

        with RULES_PATH.open("r", encoding="utf-8") as file:
            return json.load(file)

    def save_rules(self, data):
        RULES_PATH.parent.mkdir(parents=True, exist_ok=True)

        with RULES_PATH.open("w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)

    def get_rules(self):
        return self.load_rules()

    def add_rule(self, rule: RoutingRule):
        data = self.load_rules()

        if "rules" not in data:
            data["rules"] = []

        data["rules"].append(rule.model_dump())

        data["rules"] = sorted(
            data["rules"],
            key=lambda item: item.get("priority", 100)
        )

        self.save_rules(data)

        return {
            "success": True,
            "rule": rule.name
        }

    def delete_rule(self, rule_name: str):
        data = self.load_rules()
        rules = data.get("rules", [])

        remaining = [
            rule for rule in rules
            if rule.get("name") != rule_name
        ]

        if len(remaining) == len(rules):
            return {
                "success": False,
                "error": "rule not found"
            }

        data["rules"] = remaining
        self.save_rules(data)

        return {
            "success": True,
            "deleted": rule_name
        }

    def toggle_rule(self, rule_name: str):
        data = self.load_rules()
        rules = data.get("rules", [])

        for rule in rules:
            if rule.get("name") == rule_name:
                rule["enabled"] = not rule.get("enabled", True)

                self.save_rules(data)

                return {
                    "success": True,
                    "rule": rule_name,
                    "enabled": rule["enabled"]
                }

        return {
            "success": False,
            "error": "rule not found"
        }

    def clear_rules(self):
        self.save_rules({"rules": []})

        return {
            "success": True,
            "message": "all routing rules cleared"
        }

    def evaluate_rule(self, rule: dict, message: str):
        if not rule.get("enabled", True):
            return False

        match_type = rule.get("match_type", "length")
        message_lower = message.lower()

        if match_type == "keyword":
            keyword = rule.get("keyword", "").lower().strip()

            if not keyword:
                return False

            return keyword in message_lower

        if match_type == "length":
            return len(message) <= int(rule.get("max_length", 1000000))

        if match_type == "fallback":
            return True

        return False

    def select_route(self, message: str):
        data = self.load_rules()

        rules = sorted(
            data.get("rules", []),
            key=lambda item: item.get("priority", 100)
        )

        for rule in rules:
            if self.evaluate_rule(rule, message):
                return {
                    "rule": rule.get("name"),
                    "provider": rule.get("provider", "auto"),
                    "model": rule.get("model")
                }

        return None

    def select_model(self, message: str):
        route = self.select_route(message)

        if not route:
            return None

        return route.get("model")

    def evaluate_message(self, message: str):
        route = self.select_route(message)

        if not route:
            return {
                "success": False,
                "matched": False,
                "message_length": len(message),
                "route": None
            }

        return {
            "success": True,
            "matched": True,
            "message_length": len(message),
            "route": route
        }
