"""Carbon API — FastAPI application entry point."""

import asyncio
import httpx
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from src.core.config import config
from src.core.router import router as core_router

# Local Next.js dev server URL
NEXTJS_URL = "http://localhost:3000"
STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "carbon-app" / ".next"


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(core_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "app": config.app.name, "locale": config.app.locale}


# ── Catch-all: proxy non-API requests to Next.js ──
@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy_to_nextjs(request: Request, full_path: str = ""):
    # Skip API and health routes (handled above)
    if full_path.startswith("api/") or full_path == "health":
        return Response(status_code=404)

    # Try to serve static files from Next.js build first
    static_path = STATIC_DIR / "static" / full_path
    if static_path.exists() and static_path.is_file():
        return FileResponse(static_path)

    # Proxy to Next.js server
    async with httpx.AsyncClient(timeout=30) as client:
        url = f"{NEXTJS_URL}/{full_path}"
        headers = dict(request.headers)
        headers.pop("host", None)

        body = await request.body()
        resp = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
        )
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            headers=dict(resp.headers),
        )
