import os
from contextlib import asynccontextmanager
from pathlib import Path

import aiosqlite

_db_path: str = os.getenv("DB_PATH", "./cnpj.db")
_schema_path = Path(__file__).parent / "schema.sql"


@asynccontextmanager
async def get_db():
    async with aiosqlite.connect(_db_path) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def init_db() -> None:
    schema = _schema_path.read_text()
    async with aiosqlite.connect(_db_path) as db:
        await db.executescript(schema)
        await db.commit()
