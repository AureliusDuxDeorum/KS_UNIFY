from pydantic import BaseModel


class ChatRequest(BaseModel):
    provider: str = "auto"
    model: str = "auto"
    message: str
