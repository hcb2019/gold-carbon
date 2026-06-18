"""Carbon API — FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import config
from src.core.router import router as core_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify Supabase connectivity
    from src.core.db.database import get_db
    try:
        db = get_db()
        db.table("users").select("count", count="exact").execute()
        print(f"✅ Supabase conectado — {config.app.name} pronto")
    except Exception as e:
        print(f"⚠️  Supabase warning: {e}")
    yield


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
        "http://localhost:5173",
        "https://goldcarbon.vercel.app",
        "https://carbon-app-eight.vercel.app",
        "https://carbon-app.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(core_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "app": config.app.name, "locale": config.app.locale}
