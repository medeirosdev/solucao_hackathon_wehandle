from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db.connection import init_db
from routers import analyze, documents, logs
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
