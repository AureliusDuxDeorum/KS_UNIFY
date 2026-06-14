from pydantic import BaseModel


class RoutingRule(BaseModel):
    name: str
    enabled: bool = True
    priority: int = 100
    match_type: str = "length"
    keyword: str = ""
    max_length: int = 1000000
    provider: str = "auto"
    model: str
