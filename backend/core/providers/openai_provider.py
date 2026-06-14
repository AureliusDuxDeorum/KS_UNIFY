from openai import OpenAI

from backend.core.providers.base import BaseProvider


class OpenAIProvider(BaseProvider):
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1"
    ):
        super().__init__(
            name="openai",
            api_key=api_key,
            base_url=base_url
        )

        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )

    def test_connection(self) -> dict:
        try:
            self.client.models.list()

            return {
                "success": True,
                "provider": "openai",
                "status": "online"
            }

        except Exception as e:
            return {
                "success": False,
                "provider": "openai",
                "status": "offline",
                "error": str(e)
            }

    def list_models(self) -> dict:
        try:
            response = self.client.models.list()

            models = []

            for model in response.data:
                models.append({
                    "name": model.id,
                    "size": None,
                    "modified_at": None
                })

            return {
                "success": True,
                "provider": "openai",
                "models": models
            }

        except Exception as e:
            return {
                "success": False,
                "provider": "openai",
                "models": [],
                "error": str(e)
            }

    def chat(self, model: str, messages: list[dict]) -> dict:
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages
            )

            return {
                "success": True,
                "response": response.choices[0].message.content
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
