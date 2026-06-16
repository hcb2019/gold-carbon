"""Tests for API endpoints (FastAPI TestClient)."""

import pytest
from httpx import ASGITransport, AsyncClient
from src.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "Carbon"


@pytest.mark.asyncio
async def test_api_ping(client):
    response = await client.get("/api/ping")
    assert response.status_code == 200
    assert response.json() == {"ping": "pong"}
