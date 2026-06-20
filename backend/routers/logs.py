from fastapi import APIRouter, Query
from services import log_service

router = APIRouter()


@router.get("/logs")
async def get_logs(
    level: str | None = Query(default=None, description="Filtrar por nível: error, warning, info"),
    limit: int = Query(default=100, ge=1, le=500),
):
    rows = await log_service.get_logs(level=level, limit=limit)
    return {"total": len(rows), "logs": rows}


@router.delete("/logs")
async def clear_logs():
    import aiosqlite, os
    db_path = os.getenv("DB_PATH", "./cnpj.db")
    async with aiosqlite.connect(db_path) as db:
        await db.execute("DELETE FROM logs")
        await db.commit()
    return {"deleted": True}
