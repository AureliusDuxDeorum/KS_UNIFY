import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.models.chat import ChatRequest
from backend.models.routing_rule import RoutingRule

from backend.core.providers.manager import ProviderManager
from backend.core.models_registry import ModelRegistry
from backend.core.routing.router import Router
from backend.core.logger import KSLogger
from backend.core.status import StatusManager
from backend.core.services.service_manager import ServiceManager
from backend.core.dashboard import DashboardManager
from backend.core.response import success_response, error_response
from backend.core.chat_history import ChatHistory
from backend.core.api_settings import APISettings
from backend.core.network_info import NetworkInfo


app = FastAPI(
    title="KS Unify",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

provider_manager = ProviderManager()
model_registry = ModelRegistry()
router = Router()
logger = KSLogger()
status_manager = StatusManager()
service_manager = ServiceManager()
dashboard_manager = DashboardManager()
chat_history = ChatHistory()
api_settings = APISettings()
network_info = NetworkInfo()


class ProviderUpdateRequest(BaseModel):
    enabled: bool
    api_key: str = ""
    base_url: str = ""


class RouteEvaluateRequest(BaseModel):
    message: str


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.api(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.api(f"{request.method} {request.url.path} -> {response.status_code}")
    return response


def resolve_chat_route(request: ChatRequest):
    provider_name = request.provider
    model_name = request.model
    route_rule = "manual"

    if model_name == "auto":
        route = router.select_route(request.message)

        if not route:
            logger.routing("no routing rule matched")
            return None, None, None, "no routing rule matched"

        route_rule = route.get("rule", "unknown")
        model_name = route.get("model")
        provider_from_route = route.get("provider", "auto")

        if provider_name == "auto" and provider_from_route != "auto":
            provider_name = provider_from_route

        logger.routing(
            f"auto route selected rule={route_rule} provider={provider_name} model={model_name}"
        )

    if provider_name == "auto":
        provider_name = model_registry.find_provider_for_model(model_name)

        logger.routing(
            f"auto provider selected provider={provider_name} model={model_name}"
        )

        if not provider_name:
            return None, None, None, "provider not found for model"

    return provider_name, model_name, route_rule, None


@app.get("/")
async def root():
    return success_response({
        "status": "online",
        "product": "KS Unify",
        "version": "0.1.0"
    })


@app.get("/health")
async def health():
    return success_response({
        "backend": "healthy"
    })


@app.get("/api-info")
async def api_info():
    return success_response({
        "name": "KS Unify API",
        "version": "0.1.0",
        "base_url": "http://localhost:8000",
        "endpoints": [
            {"method": "GET", "path": "/health", "description": "Backend health check"},
            {"method": "GET", "path": "/dashboard", "description": "Unified dashboard data"},
            {"method": "GET", "path": "/providers", "description": "List configured providers"},
            {"method": "GET", "path": "/models", "description": "List models from all enabled providers"},
            {"method": "GET", "path": "/routing", "description": "List routing rules"},
            {"method": "POST", "path": "/routing/evaluate", "description": "Preview routing decision"},
            {"method": "POST", "path": "/chat", "description": "Non-streaming unified chat"},
            {"method": "POST", "path": "/chat/stream", "description": "Streaming unified chat"},
            {"method": "GET", "path": "/history", "description": "Conversation history"},
            {"method": "GET", "path": "/logs/{log_name}", "description": "Read log entries"},
            {"method": "GET", "path": "/services", "description": "List managed services"}
        ],
        "chat_example": {
            "provider": "auto",
            "model": "auto",
            "message": "Hello from KS Unify"
        }
    })


@app.get("/network-info")
async def get_network_info():
    settings = api_settings.load()
    return network_info.get_info(port=settings.get("port", 8000))


@app.get("/api-settings")
async def get_api_settings():
    return api_settings.get_base_url()


@app.post("/api-settings")
async def update_api_settings(settings: dict):
    return api_settings.save(settings)


@app.get("/status")
async def status():
    return status_manager.get_status()


@app.get("/dashboard")
async def dashboard():
    return dashboard_manager.get_dashboard()


@app.get("/logs/{log_name}")
async def read_log(log_name: str, lines: int = 100):
    return logger.read(log_name=log_name, lines=lines)


@app.get("/history")
async def history(limit: int = 50):
    return chat_history.list_entries(limit=limit)


@app.delete("/history")
async def clear_history():
    return chat_history.clear_entries()


@app.get("/services")
async def services():
    return service_manager.list_services()


@app.get("/services/{service_name}")
async def service(service_name: str):
    return service_manager.get_service(service_name)


@app.post("/services/{service_name}/start")
async def start_service(service_name: str):
    logger.service(f"start service={service_name}")
    return service_manager.start_service(service_name)


@app.post("/services/{service_name}/stop")
async def stop_service(service_name: str):
    logger.service(f"stop service={service_name}")
    return service_manager.stop_service(service_name)


@app.post("/services/{service_name}/restart")
async def restart_service(service_name: str):
    logger.service(f"restart service={service_name}")
    return service_manager.restart_service(service_name)


@app.get("/providers")
async def providers():
    return provider_manager.list_providers()


@app.post("/providers/{provider_name}")
async def update_provider(provider_name: str, request: ProviderUpdateRequest):
    logger.provider(f"update provider={provider_name} enabled={request.enabled}")

    return provider_manager.update_provider(
        provider_name=provider_name,
        enabled=request.enabled,
        api_key=request.api_key,
        base_url=request.base_url
    )


@app.get("/providers/{provider_name}/test")
async def test_provider(provider_name: str):
    logger.provider(f"test provider={provider_name}")
    return provider_manager.test_provider(provider_name)


@app.get("/providers/{provider_name}/models")
async def provider_models(provider_name: str):
    logger.provider(f"models provider={provider_name}")
    return provider_manager.list_provider_models(provider_name)


@app.get("/models")
async def models():
    return model_registry.list_models()


@app.get("/routing")
async def routing_rules():
    return router.get_rules()


@app.post("/routing")
async def add_routing_rule(rule: RoutingRule):
    logger.routing(
        f"add rule={rule.name} type={rule.match_type} priority={rule.priority} model={rule.model}"
    )

    return router.add_rule(rule)


@app.post("/routing/evaluate")
async def evaluate_routing(request: RouteEvaluateRequest):
    return router.evaluate_message(request.message)


@app.post("/routing/{rule_name}/toggle")
async def toggle_routing_rule(rule_name: str):
    logger.routing(f"toggle rule={rule_name}")
    return router.toggle_rule(rule_name)


@app.delete("/routing/{rule_name}")
async def delete_routing_rule(rule_name: str):
    logger.routing(f"delete rule={rule_name}")
    return router.delete_rule(rule_name)


@app.delete("/routing")
async def clear_routing_rules():
    logger.routing("clear all routing rules")
    return router.clear_rules()


@app.post("/chat")
async def chat(request: ChatRequest):
    start = time.time()

    provider_name, model_name, route_rule, error = resolve_chat_route(request)

    if error:
        return error_response(error)

    logger.provider(
        f"chat provider={provider_name} model={model_name}"
    )

    result = provider_manager.chat(
        provider_name=provider_name,
        model=model_name,
        message=request.message
    )

    latency_ms = int((time.time() - start) * 1000)

    chat_history.add_entry(
        provider=provider_name,
        model=model_name,
        route_rule=route_rule,
        prompt=request.message,
        response=result.get("response", ""),
        success=result.get("success", False),
        error=result.get("error", ""),
        latency_ms=latency_ms
    )

    return {
        "provider": provider_name,
        "model": model_name,
        "route_rule": route_rule,
        "latency_ms": latency_ms,
        **result
    }


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    start = time.time()

    provider_name, model_name, route_rule, error = resolve_chat_route(request)

    if error:
        return StreamingResponse(
            iter([f"ERROR: {error}"]),
            media_type="text/plain"
        )

    logger.provider(
        f"stream chat provider={provider_name} model={model_name}"
    )

    def token_generator():
        full_response = ""

        try:
            for token in provider_manager.stream_chat(
                provider_name=provider_name,
                model=model_name,
                message=request.message
            ):
                full_response += token
                yield token

            latency_ms = int((time.time() - start) * 1000)

            chat_history.add_entry(
                provider=provider_name,
                model=model_name,
                route_rule=route_rule,
                prompt=request.message,
                response=full_response,
                success=True,
                error="",
                latency_ms=latency_ms
            )

        except Exception as exc:
            latency_ms = int((time.time() - start) * 1000)
            error_message = str(exc)

            chat_history.add_entry(
                provider=provider_name,
                model=model_name,
                route_rule=route_rule,
                prompt=request.message,
                response=full_response,
                success=False,
                error=error_message,
                latency_ms=latency_ms
            )

            yield f"\nERROR: {error_message}"

    return StreamingResponse(
        token_generator(),
        media_type="text/plain"
    )
