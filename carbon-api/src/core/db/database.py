from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from src.core.config import config

_engine = None
_async_session = None


def _get_engine():
    global _engine
    if _engine is None:
        if not config.database_url:
            raise RuntimeError("SUPABASE_DATABASE_URL not configured")
        _engine = create_async_engine(config.database_url, echo=False)
    return _engine


def _get_sessionmaker():
    global _async_session
    if _async_session is None:
        _async_session = async_sessionmaker(_get_engine(), class_=AsyncSession, expire_on_commit=False)
    return _async_session


async def get_db() -> AsyncSession:
    async with _get_sessionmaker()() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    from src.core.db.models import Base
    async with _get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
