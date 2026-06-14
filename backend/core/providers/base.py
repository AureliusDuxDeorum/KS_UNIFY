from abc import ABC, abstractmethod


class BaseProvider(ABC):
    def __init__(self, name: str, api_key: str | None = None, base_url: str | None = None):
        self.name = name
        self.api_key = api_key
        self.base_url = base_url

    @abstractmethod
    def test_connection(self) -> dict:
        pass

    @abstractmethod
    def list_models(self) -> dict:
        pass

    @abstractmethod
    def chat(self, model: str, messages: list[dict]) -> dict:
        pass
