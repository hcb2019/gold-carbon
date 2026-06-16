# Carbon Credit Trader — Plano de Implementação (MVP)

> **Para Hermes:** Use subagent-driven-development para implementar tarefa por tarefa.
> **Ambiente:** Nando tem Cursor com modelos de IA. Backend roda no VPS. Frontend no Vercel.

**Goal:** MVP funcional — usuário PF conecta BYD, vê créditos acumulados, dashboard com CO₂ evitado.

**Tech Stack:** Python 3.13 + FastAPI + pyBYD + PostgreSQL (Supabase) + Next.js 16 + Tailwind + shadcn/ui

---

## Fase 1: Backend Base

### Task 1: Inicializar projeto Python com uv

**Objective:** Criar estrutura base do carbon-api com ferramentas modernas

**Files:**
- Create: `/opt/data/carbon-app/carbon-api/pyproject.toml`
- Create: `/opt/data/carbon-app/carbon-api/.python-version`
- Create: `/opt/data/carbon-app/carbon-api/src/core/__init__.py`
- Create: `/opt/data/carbon-app/carbon-api/src/fleet/__init__.py`

**Step 1: Criar projeto**

```bash
cd /opt/data/carbon-app
mkdir -p carbon-api/src/core carbon-api/src/fleet carbon-api/tests
cd carbon-api
uv init --bare
```

**Step 2: Configurar .python-version**

```bash
echo "3.13" > .python-version
```

**Step 3: Configurar pyproject.toml**

```toml
[project]
name = "carbon-api"
version = "0.1.0"
description = "Carbon Credit Trader API — BYD vehicle carbon credit calculator"
requires-python = ">=3.13"
dependencies = []

[dependency-groups]
dev = [{include-group = "lint"}, {include-group = "test"}]
lint = ["ruff", "ty"]
test = ["pytest", "pytest-cov", "pytest-asyncio", "httpx"]

[tool.ruff]
line-length = 100
target-version = "py313"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "SIM"]
ignore = []

[tool.pytest.ini_options]
addopts = ["--cov=src/core", "--cov-fail-under=80", "-v"]
testpaths = ["tests"]

[tool.ty.terminal]
error-on-warning = true

[tool.ty.environment]
python-version = "3.13"

[build-system]
requires = ["uv_build>=0.8.14"]
build-backend = "uv_build"
```

**Step 4: Criar __init__.py vazios**

```bash
touch src/core/__init__.py src/fleet/__init__.py tests/__init__.py
```

**Step 5: Commit**

```bash
git -C /opt/data/carbon-app add carbon-api/
git -C /opt/data/carbon-app commit -m "feat: init carbon-api project with uv"
```

---

### Task 2: Adicionar dependências

**Objective:** Instalar FastAPI, pyBYD, SQLAlchemy e ferramentas

**Files:**
- Modify: `pyproject.toml`

**Step 1: Adicionar deps de produção**

```bash
cd /opt/data/carbon-app/carbon-api
uv add fastapi uvicorn pybyd sqlalchemy asyncpg psycopg2-binary \
  python-dotenv pyyaml httpx pydantic pydantic-settings
```

**Step 2: Adicionar deps de dev**

```bash
uv add --group dev ruff ty pytest pytest-cov pytest-asyncio httpx
```

**Step 3: Sync e verificar**

```bash
uv sync --all-groups
uv run python -c "import fastapi; import pybyd; print('OK')"
```

**Step 4: Commit**

```bash
git -C /opt/data/carbon-app add carbon-api/pyproject.toml carbon-api/uv.lock
git -C /opt/data/carbon-app commit -m "feat: add core dependencies"
```

---

### Task 3: Criar config.yaml e settings

**Objective:** Externalizar TODAS as configurações mutáveis

**Files:**
- Create: `src/core/config.py`
- Create: `config.yaml`
- Create: `.env.example`

**Step 1: Criar config.yaml**

```yaml
byd:
  api_timeout_seconds: 30
  sync_interval_hours: 24
  history_days_back: 90

carbon:
  emission_factors:
    gasoline_kg_co2_per_liter: 2.3
    brazil_grid_kg_co2_per_kwh: 0.062
    gasoline_km_per_liter: 12.0
  price_per_ton_brl: 45.0
  commission_pct: 0.15

partner:
  provider: carbonext
  min_payout_brl: 50.0
  payout_business_days: 5

database:
  url: ${SUPABASE_DATABASE_URL}

app:
  name: "Carbon"
  tagline: "Seu BYD vale dinheiro. Descubra quanto."
  currency: "BRL"
  locale: "pt-BR"
```

**Step 2: Criar .env.example**

```bash
SUPABASE_DATABASE_URL=postgresql://user:pass@host:5432/carbon
BYD_USERNAME=seu_email
BYD_PASSWORD=sua_senha
CARBON_API_SECRET=chave-secreta-api
```

**Step 3: Criar config loader (src/core/config.py)**

```python
import os
from pathlib import Path
import yaml
from pydantic_settings import BaseSettings


class BYDConfig(BaseSettings):
    api_timeout_seconds: int = 30
    sync_interval_hours: int = 24
    history_days_back: int = 90


class EmissionFactors(BaseSettings):
    gasoline_kg_co2_per_liter: float = 2.3
    brazil_grid_kg_co2_per_kwh: float = 0.062
    gasoline_km_per_liter: float = 12.0


class CarbonConfig(BaseSettings):
    emission_factors: EmissionFactors = EmissionFactors()
    price_per_ton_brl: float = 45.0
    commission_pct: float = 0.15


class PartnerConfig(BaseSettings):
    provider: str = "carbonext"
    min_payout_brl: float = 50.0
    payout_business_days: int = 5


class AppConfig(BaseSettings):
    name: str = "Carbon"
    tagline: str = "Seu BYD vale dinheiro. Descubra quanto."
    currency: str = "BRL"
    locale: str = "pt-BR"


class Config(BaseSettings):
    byd: BYDConfig = BYDConfig()
    carbon: CarbonConfig = CarbonConfig()
    partner: PartnerConfig = PartnerConfig()
    app: AppConfig = AppConfig()
    database_url: str = ""

    @classmethod
    def load(cls, path: str = "config.yaml") -> "Config":
        with open(path) as f:
            data = yaml.safe_load(f)
        # Resolve env vars
        db_url = data.get("database", {}).get("url", "")
        if db_url.startswith("${") and db_url.endswith("}"):
            env_var = db_url[2:-1]
            data["database"]["url"] = os.getenv(env_var, "")
        return cls(**data)


config = Config.load()
```

**Step 4: Testar carregamento**

```bash
cd /opt/data/carbon-app/carbon-api
uv run python -c "from src.core.config import config; print(config.app.name)"
```

Expected: `Carbon`

**Step 5: Commit**

```bash
git -C /opt/data/carbon-app add carbon-api/
git -C /opt/data/carbon-app commit -m "feat: add config.yaml and settings loader"
```

---

### Task 4: Criar modelos do banco (SQLAlchemy)

**Objective:** Definir tabelas: users, vehicles, trips, credits, payouts, sync_logs

**Files:**
- Create: `src/core/db/database.py`
- Create: `src/core/db/models.py`
- Create: `src/core/db/__init__.py`

**Step 1: Conexão com banco (database.py)**

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from src.core.config import config

engine = create_async_engine(config.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session


async def init_db():
    from src.core.db.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

**Step 2: Modelos (models.py)**

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String)
    pix_key = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    vin = Column(String, unique=True, nullable=False, index=True)
    model = Column(String)
    year = Column(Integer)
    battery_kwh = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class Trip(Base):
    __tablename__ = "trips"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    distance_km = Column(Float, nullable=False)
    kwh_used = Column(Float, nullable=False)
    co2_saved_kg = Column(Float, nullable=False)
    source = Column(String, default="auto")
    created_at = Column(DateTime, default=datetime.utcnow)


class Credit(Base):
    __tablename__ = "credits"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=True)
    amount_brl = Column(Float, nullable=False)
    co2_kg = Column(Float, nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)


class Payout(Base):
    __tablename__ = "payouts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount_brl = Column(Float, nullable=False)
    commission_brl = Column(Float, nullable=False)
    pix_key = Column(String, nullable=False)
    status = Column(String, default="pending")
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SyncLog(Base):
    __tablename__ = "sync_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    started_at = Column(DateTime, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    trips_found = Column(Integer, default=0)
    status = Column(String, default="running")
```

**Step 3: Criar __init__.py**

```python
from src.core.db.database import get_db, init_db
from src.core.db.models import Base, User, Vehicle, Trip, Credit, Payout, SyncLog

__all__ = ["get_db", "init_db", "Base", "User", "Vehicle", "Trip", "Credit", "Payout", "SyncLog"]
```

**Step 4: Commit**

```bash
git -C /opt/data/carbon-app add carbon-api/
git -C /opt/data/carbon-app commit -m "feat: add SQLAlchemy models (6 tables)"
```

---

### Task 5: Criar FastAPI app base

**Objective:** Servidor FastAPI mínimo com health check, rotas vazias e lifespan

**Files:**
- Create: `src/main.py`
- Create: `src/core/router.py`

**Step 1: App principal (src/main.py)**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import config
from src.core.router import router as core_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init DB
    from src.core.db import init_db
    await init_db()
    yield
    # Shutdown


app = FastAPI(
    title=config.app.name,
    description=config.app.tagline,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(core_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "app": config.app.name}
```

**Step 2: Router base (src/core/router.py)**

```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
async def ping():
    return {"ping": "pong"}
```

**Step 3: Rodar e testar**

```bash
cd /opt/data/carbon-app/carbon-api
SUPABASE_DATABASE_URL=postgresql://dummy:dummy@localhost:5432/test uv run uvicorn src.main:app --port 8000 &
sleep 2
curl http://localhost:8000/health
```

Expected: `{"status":"ok","app":"Carbon"}`

**Step 4: Commit**

```bash
git -C /opt/data/carbon-app add carbon-api/
git -C /opt/data/carbon-app commit -m "feat: add FastAPI app with health check"
```

---

### Task 6: Criar calculadora de carbono (TDD)

**Objective:** Implementar fórmula de cálculo com testes antes do código

**Files:**
- Create: `tests/unit/test_calculator.py`
- Create: `src/core/carbon/calculator.py`
- Create: `src/core/carbon/__init__.py`

**Step 1: Escrever teste falhando (test_calculator.py)**

```python
import pytest
from src.core.carbon.calculator import calculate_co2_saved, calculate_credit


class TestCalculateCO2Saved:
    def test_zero_distance_returns_zero(self):
        result = calculate_co2_saved(distance_km=0, kwh_used=0)
        assert result == pytest.approx(0.0)

    def test_seal_1000km_month(self):
        # BYD Seal: 1000 km, 15 kWh/100km = 150 kWh
        result = calculate_co2_saved(distance_km=1000, kwh_used=150)
        # Gasoline: 1000/12 * 2.3 = 191.67 kg
        # Electric: 150 * 0.062 = 9.3 kg
        # Saved: 191.67 - 9.3 = 182.37 kg
        assert result == pytest.approx(182.37, rel=0.01)

    def test_short_trip_rounds_correctly(self):
        result = calculate_co2_saved(distance_km=5, kwh_used=0.75)
        assert result > 0
        assert result == pytest.approx(0.91, rel=0.01)


class TestCalculateCredit:
    def test_converts_co2_to_brl(self):
        result = calculate_credit(co2_kg=182.37)
        # 182.37 kg = 0.18237 t × R$45/t × 0.85 = R$6.97
        assert result == pytest.approx(6.97, rel=0.01)

    def test_zero_co2_returns_zero(self):
        result = calculate_credit(co2_kg=0)
        assert result == 0.0

    def test_commission_is_applied(self):
        # Without commission: 1000 kg = 1 t = R$45
        result = calculate_credit(co2_kg=1000)
        # R$45 × 0.85 = R$38.25
        assert result == pytest.approx(38.25, rel=0.01)
```

**Step 2: Rodar teste (deve falhar)**

```bash
cd /opt/data/carbon-app/carbon-api
uv run pytest tests/unit/test_calculator.py -v
```

Expected: FAIL — module not found

**Step 3: Implementar (calculator.py)**

```python
from src.core.config import config


def calculate_co2_saved(distance_km: float, kwh_used: float) -> float:
    """Calculate CO₂ saved by driving electric vs gasoline.

    Args:
        distance_km: Distance driven in kilometers
        kwh_used: Electricity consumed in kWh

    Returns:
        CO₂ saved in kilograms
    """
    if distance_km <= 0:
        return 0.0

    ef = config.carbon.emission_factors
    # Gasoline CO₂ that WOULD have been emitted
    liters_gasoline = distance_km / ef.gasoline_km_per_liter
    gasoline_co2 = liters_gasoline * ef.gasoline_kg_co2_per_liter
    # Electric CO₂ that WAS emitted (Brazil grid)
    electric_co2 = kwh_used * ef.brazil_grid_kg_co2_per_kwh
    # Net saved
    return max(0.0, gasoline_co2 - electric_co2)


def calculate_credit(co2_kg: float) -> float:
    """Convert CO₂ saved to BRL credits.

    Args:
        co2_kg: CO₂ saved in kilograms

    Returns:
        Credit value in BRL (after commission)
    """
    if co2_kg <= 0:
        return 0.0

    tons = co2_kg / 1000.0
    gross = tons * config.carbon.price_per_ton_brl
    net = gross * (1.0 - config.carbon.commission_pct)
    return round(net, 2)
```

**Step 4: Rodar teste (deve passar)**

```bash
uv run pytest tests/unit/test_calculator.py -v
```

Expected: 5 passed

**Step 5: Commit**

```bash
git -C /opt/data/carbon-app add carbon-api/
git -C /opt/data/carbon-app commit -m "feat: add carbon calculator with TDD (5 tests passing)"
```

---

### Task 7: Criar wrapper pyBYD (com mock para testes)

**Objective:** Encapsular pyBYD, com interface testável

**Files:**
- Create: `src/core/byd/__init__.py`
- Create: `src/core/byd/client.py`
- Create: `src/core/byd/models.py`
- Create: `tests/integration/test_byd_client.py`

**Step 1: Modelos BYD (models.py)**

```python
from dataclasses import dataclass
from datetime import datetime


@dataclass
class BYDVehicle:
    vin: str
    model: str | None = None
    year: int | None = None
    battery_kwh: float | None = None


@dataclass
class BYDTrip:
    date: datetime
    distance_km: float
    kwh_used: float
    start_location: str | None = None
    end_location: str | None = None


@dataclass
class BYDRealtime:
    battery_percent: float
    range_km: float
    temperature_c: float | None = None
    is_charging: bool = False
```

**Step 2: Cliente BYD (client.py)**

```python
from datetime import datetime, timedelta
from pybyd import BydClient, BydConfig
from src.core.byd.models import BYDVehicle, BYDTrip, BYDRealtime
from src.core.config import config


class BYDService:
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self._client: BydClient | None = None

    async def _get_client(self) -> BydClient:
        if self._client is None:
            cfg = BydConfig(username=self.username, password=self.password)
            self._client = BydClient(cfg)
            await self._client.login()
        return self._client

    async def get_vehicles(self) -> list[BYDVehicle]:
        client = await self._get_client()
        vehicles = await client.get_vehicles()
        return [
            BYDVehicle(vin=v.vin, model=v.model, year=v.year, battery_kwh=v.battery_capacity)
            for v in vehicles
        ]

    async def get_trips(self, vin: str, days_back: int = 90) -> list[BYDTrip]:
        client = await self._get_client()
        raw_trips = await client.get_trip_list(vin, days=days_back)
        return [
            BYDTrip(
                date=t.date,
                distance_km=t.distance / 1000.0 if t.distance else 0,
                kwh_used=t.power_consumption if t.power_consumption else 0,
                start_location=t.start_address,
                end_location=t.end_address,
            )
            for t in raw_trips
            if t.distance and t.distance > 0
        ]

    async def get_realtime(self, vin: str) -> BYDRealtime:
        client = await self._get_client()
        data = await client.get_vehicle_realtime(vin)
        return BYDRealtime(
            battery_percent=data.elec_percent or 0,
            range_km=data.remain_elec_range or 0,
            temperature_c=getattr(data, "inside_temp", None),
            is_charging=data.charge_status == 1 if data.charge_status else False,
        )

    async def close(self):
        if self._client:
            await self._client.close()
            self._client = None
```

**Step 3: Teste de integração com mock**

```python
# tests/integration/test_byd_client.py (esqueleto — mock do pyBYD)
import pytest
from unittest.mock import AsyncMock, patch
from src.core.byd.client import BYDService


@pytest.mark.asyncio
async def test_get_vehicles_returns_list():
    with patch("src.core.byd.client.BydClient") as mock_client:
        mock_client.return_value.login = AsyncMock()
        mock_client.return_value.get_vehicles = AsyncMock(return_value=[
            type("V", (), {"vin": "TESTVIN123", "model": "Seal", "year": 2025, "battery_capacity": 82.5})()
        ])

        service = BYDService("test@email.com", "pass123")
        vehicles = await service.get_vehicles()
        assert len(vehicles) == 1
        assert vehicles[0].vin == "TESTVIN123"
```

**Step 4: Rodar teste**

```bash
uv run pytest tests/integration/test_byd_client.py -v
```

**Step 5: Commit**

```bash
git -C /opt/data/carbon-app add carbon-api/
git -C /opt/data/carbon-app commit -m "feat: add BYD client wrapper with integration test"
```

---

### Task 8: Criar serviço de sincronização

**Objective:** Job que puxa viagens da BYD e salva no banco

**Files:**
- Create: `src/core/byd/sync.py`
- Create: `tests/integration/test_sync.py`

**Step 1: Serviço de sync (sync.py)**

```python
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.byd.client import BYDService
from src.core.db.models import Vehicle, Trip, SyncLog
from src.core.carbon.calculator import calculate_co2_saved


async def sync_vehicle_trips(
    db: AsyncSession,
    byd_service: BYDService,
    vehicle: Vehicle,
    days_back: int = 90,
) -> int:
    """Sync trips for a vehicle. Returns number of new trips found."""
    # Create sync log
    sync_log = SyncLog(vehicle_id=vehicle.id, started_at=datetime.utcnow())
    db.add(sync_log)
    await db.commit()

    try:
        # Fetch from BYD
        raw_trips = await byd_service.get_trips(vehicle.vin, days_back=days_back)
        new_count = 0

        for trip in raw_trips:
            # Check if trip already exists (dedup by date + distance)
            existing = await db.execute(
                # Simplificação: verificar por data exata
                # Em produção, usar hash ou ID externo
                f"SELECT id FROM trips WHERE vehicle_id='{vehicle.id}' AND date='{trip.date}'"
            )
            if existing.first():
                continue

            co2 = calculate_co2_saved(trip.distance_km, trip.kwh_used)
            db_trip = Trip(
                vehicle_id=vehicle.id,
                date=trip.date,
                distance_km=trip.distance_km,
                kwh_used=trip.kwh_used,
                co2_saved_kg=co2,
            )
            db.add(db_trip)
            new_count += 1

        await db.commit()

        # Update sync log
        sync_log.finished_at = datetime.utcnow()
        sync_log.trips_found = new_count
        sync_log.status = "done"
        await db.commit()

        return new_count
    except Exception as e:
        sync_log.status = "error"
        sync_log.finished_at = datetime.utcnow()
        await db.commit()
        raise e
```

**Step 2: Teste de integração**

```python
# tests/integration/test_sync.py (esqueleto com mock)
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_sync_saves_new_trips():
    # Mock db session + BYD service
    # Verificar que trips são persistidas
    pass  # Implementação completa no código real
```

**Step 3: Commit**

```bash
git -C /opt/data/carbon-app add carbon-api/
git -C /opt/data/carbon-app commit -m "feat: add vehicle sync service"
```

---

### Task 9: Criar endpoints da API

**Objective:** Rotas REST: veículos, viagens, créditos, resgate

**Files:**
- Create: `src/core/router.py` (expandir)
- Create: `src/core/schemas.py`

**Step 1: Schemas Pydantic (schemas.py)**

```python
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class VehicleOut(BaseModel):
    id: UUID
    vin: str
    model: str | None
    year: int | None
    battery_kwh: float | None

    class Config:
        from_attributes = True


class TripOut(BaseModel):
    id: UUID
    date: datetime
    distance_km: float
    kwh_used: float
    co2_saved_kg: float

    class Config:
        from_attributes = True


class CreditSummary(BaseModel):
    total_brl: float
    total_co2_kg: float
    this_month_brl: float
    projected_monthly_brl: float
    commission_brl: float


class PayoutRequest(BaseModel):
    pix_key: str


class PayoutOut(BaseModel):
    id: UUID
    amount_brl: float
    commission_brl: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
```

**Step 2: Expandir router (router.py)**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from src.core.db.database import get_db
from src.core.db.models import Vehicle, Trip, Credit
from src.core.schemas import VehicleOut, TripOut, CreditSummary

router = APIRouter()


@router.get("/vehicles", response_model=list[VehicleOut])
async def list_vehicles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vehicle))
    return result.scalars().all()


@router.get("/vehicles/{vehicle_id}/trips", response_model=list[TripOut])
async def list_trips(vehicle_id: str, limit: int = 30, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Trip)
        .where(Trip.vehicle_id == vehicle_id)
        .order_by(Trip.date.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/credits/summary", response_model=CreditSummary)
async def credit_summary(db: AsyncSession = Depends(get_db)):
    # Total all time
    total_result = await db.execute(
        select(func.sum(Credit.amount_brl), func.sum(Credit.co2_kg))
    )
    total_brl, total_co2 = total_result.first()
    total_brl = total_brl or 0
    total_co2 = total_co2 or 0

    # This month
    # (simplificado — em produção usar filtro de data)

    return CreditSummary(
        total_brl=round(total_brl, 2),
        total_co2_kg=round(total_co2, 2),
        this_month_brl=0.0,
        projected_monthly_brl=0.0,
        commission_brl=round(total_brl * 0.15 / 0.85, 2),
    )


# Payout endpoints (simplificado para MVP)
@router.get("/payouts/history", response_model=list[dict])
async def payout_history(db: AsyncSession = Depends(get_db)):
    from src.core.db.models import Payout
    result = await db.execute(select(Payout).order_by(Payout.created_at.desc()).limit(20))
    return [{"id": str(p.id), "amount_brl": p.amount_brl, "status": p.status} for p in result.scalars().all()]
```

**Step 3: Testar endpoints**

```bash
curl http://localhost:8000/api/vehicles
curl http://localhost:8000/api/credits/summary
```

**Step 4: Commit**

```bash
git -C /opt/data/carbon-app add carbon-api/
git -C /opt/data/carbon-app commit -m "feat: add REST API endpoints (vehicles, trips, credits)"
```

---

## Fase 2: Frontend Base (Próximo arquivo de plano)

---

**Status:** Fase 1 do plano completa (9 tasks). Fase 2 (Frontend Next.js) será detalhada em arquivo separado quando aprovado.
