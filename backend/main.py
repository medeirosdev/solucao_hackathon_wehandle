from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db.connection import init_db
from routers import analyze, documents, logs, usage
from services import log_service
from services.transparency_service import load_lista_suja

app = FastAPI(title="Score de Conformidade API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5200",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    await init_db()
    load_lista_suja()


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    op = f"{request.method} {request.url.path}"
    if exc.status_code >= 500:
        await log_service.error("http", op, exc)
    else:
        await log_service.warning("http", op, f"HTTP {exc.status_code}: {exc.detail}")
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    await log_service.error("http", f"{request.method} {request.url.path} [validation]", exc)
    return JSONResponse(status_code=422, content={"detail": str(exc.errors())})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    await log_service.error(
        service="http",
        operation=f"{request.method} {request.url.path}",
        exc=exc,
    )
    return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor"})


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


app.include_router(analyze.router)
app.include_router(documents.router)
app.include_router(logs.router)
app.include_router(usage.router)
