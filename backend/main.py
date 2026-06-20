from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.connection import init_db
from routers import analyze, documents
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


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


app.include_router(analyze.router)
app.include_router(documents.router)
