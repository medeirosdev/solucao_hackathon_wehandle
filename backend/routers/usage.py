from fastapi import APIRouter, Query
from services import usage_service

router = APIRouter()


@router.get("/usage")
async def get_usage():
    return await usage_service.get_stats()


@router.get("/usage/history")
async def get_history(limit: int = Query(default=100, ge=1, le=500)):
    return {"history": await usage_service.get_history(limit)}
