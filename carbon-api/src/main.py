"""Carbon API — FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import config
from src.core.router import router as core_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init database tables
    from src.core.db import init_db
    await init_db()
    yield
    # Shutdown: clean connections


app = FastAPI(
    title=config.app.name,
    description=config.app.tagline,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(core_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "app": config.app.name, "locale": config.app.locale}
