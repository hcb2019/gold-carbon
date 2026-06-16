# Carbon Credit Trader — Design Spec

**Status:** Aprovado (aguardando implementação)
**Data:** 2026-06-16
**Autor:** Hermes Agent + Hernando Cândido

---

## 1. Visão Geral

Aplicativo que transforma quilômetros rodados em BYD elétrico em créditos de carbono monetizáveis. O app monitora as viagens via API cloud da BYD (pyBYD), calcula o CO₂ evitado comparado a um carro a gasolina equivalente, e vende os créditos via certificadora parceira (Carbonext). O usuário recebe via Pix.

**Diferencial:** Zero instalação no carro. Só login com conta BYD. Primeira experiência já mostra valor acumulado dos últimos 90 dias — impacto imediato.

---

## 2. Decisões de Produto

| Decisão | Escolha |
|---|---|
| Monetização | Gratuito + 15% comissão nos créditos vendidos |
| Certificadora | Parceira existente (Carbonext/MOSS) |
| Público inicial | Pessoa Física (BYD Dolphin/Seal/Yuan Plus) |
| Expansão futura | Frota (módulo `fleet/` independente) |
| Stack backend | Python FastAPI + pyBYD (nosso VPS) |
| Stack frontend | Next.js PWA + Tailwind + shadcn/ui (Vercel) |
| Banco de dados | Supabase PostgreSQL |
| Autenticação | NextAuth (Google OAuth) |

---

## 3. Jornada do Usuário

```
1. 📥 CADASTRO (30s)
   Login com Google → Conecta conta BYD (usuário+senha)
   → App busca VIN, modelo, ano automaticamente

2. 🔄 PRIMEIRA SINC (2min em background)
   Puxa histórico de viagens dos últimos 90 dias
   → Calcula kWh rodados → CO₂ evitado
   → "🪙 R$ 127 em créditos acumulados"

3. 📊 DASHBOARD (recorrente)
   Créditos do mês (R$) | CO₂ evitado (kg) | Ranking BR
   Próximo pagamento estimado

4. 🔄 SINC AUTOMÁTICA (diária, madrugada)
   Puxa novas viagens → Recalcula créditos
   → Push: "+R$ 4,30 em créditos ontem"

5. 💰 RESGATE (R$ 50+ acumulado)
   Solicita Pix → Certificadora valida → App 15%
   → 3-5 dias úteis → Pix na conta
```

---

## 4. Arquitetura

```
┌─────────────────────────────────────────────────┐
│                  📱 PWA                         │
│          Next.js 16 + Tailwind + shadcn         │
│              Vercel (edge)                      │
│                                                 │
│  /dashboard  /viagens  /creditos  /perfil       │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│              🐍 Carbon API                      │
│          FastAPI (nosso VPS)                    │
│                                                 │
│  /sync-vehicle  /calculate  /transactions       │
│  ┌──────────┐  ┌────────────┐  ┌─────────────┐ │
│  │ BYD Sync │  │  Carbon    │  │ Certificadora│ │
│  │ (pyBYD)  │  │ Calculator │  │  Connector  │ │
│  └──────────┘  └────────────┘  └─────────────┘ │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              🗄️ Supabase PostgreSQL             │
│  users │ vehicles │ trips │ credits │ payouts   │
└─────────────────────────────────────────────────┘
```

**Zero coupling:** Frontend Next.js e Backend FastAPI são serviços independentes. Comunicam via REST. Cada um deploya separadamente.

---

## 5. Estrutura de Projeto

### Backend — `carbon-api/`

```
carbon-api/
├── pyproject.toml           # uv, Python 3.13
├── config.yaml              # TUDO externalizado
├── src/
│   ├── main.py              # FastAPI app
│   ├── core/
│   │   ├── byd/
│   │   │   ├── client.py    # pyBYD wrapper
│   │   │   ├── sync.py      # Job de sincronização diária
│   │   │   └── models.py    # Vehicle, Trip, RealtimeData
│   │   ├── carbon/
│   │   │   ├── calculator.py # Fórmula de cálculo
│   │   │   ├── emission.py   # Fatores de emissão por país
│   │   │   └── pricing.py    # Cotação atual do carbono
│   │   ├── partner/
│   │   │   ├── base.py       # Interface abstrata (ABC)
│   │   │   └── carbonext.py  # Implementação concreta
│   │   ├── payouts/
│   │   │   ├── service.py    # Lógica de resgate
│   │   │   └── pix.py        # Integração Pix
│   │   └── db/
│   │       ├── models.py     # SQLAlchemy
│   │       └── database.py   # Conexão Supabase
│   └── fleet/                # Expansion pack (Frota)
│       ├── __init__.py
│       ├── router.py         # /fleet/* endpoints
│       ├── models.py         # Fleet, FleetVehicle
│       ├── dashboard.py      # Dashboard multi-veículo
│       └── reports.py        # Relatórios fiscais
└── tests/
    ├── unit/
    │   ├── test_calculator.py
    │   ├── test_emission.py
    │   └── test_pricing.py
    ├── integration/
    │   ├── test_byd_sync.py
    │   ├── test_payout.py
    │   └── test_partner_connector.py
    └── e2e/
        └── test_sync_to_credit.py
```

**Contrato entre `core` e `fleet`:**
- `core` exporta funções que `fleet` consome
- `fleet` NUNCA é importado por `core`
- Frontend tem feature flag `fleet/` — ativa/desativa sem tocar no código PF

### Frontend — `carbon-app/`

```
carbon-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # PWA metadata + manifest
│   │   ├── page.tsx             # Landing page pública
│   │   ├── dashboard/page.tsx   # Área logada (protegida)
│   │   ├── viagens/page.tsx     # Histórico de viagens
│   │   ├── creditos/page.tsx    # Créditos e resgate Pix
│   │   ├── perfil/page.tsx      # Conta BYD + preferências
│   │   └── api/                 # API Routes (proxy Carbon API)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui base
│   │   ├── carbon/              # CarbonCreditCard, CO2Gauge, CreditChart
│   │   ├── vehicle/             # VehicleStatus, TripList, SyncIndicator
│   │   └── layout/              # AppShell, BottomNav, Sidebar
│   └── lib/
│       ├── api.ts               # Cliente da Carbon API (fetch wrapper)
│       ├── auth.ts              # NextAuth config (Google provider)
│       ├── carbon.ts            # Formatters: R$, kg, tCO₂
│       └── constants.ts         # URLs, feature flags
└── public/
    ├── manifest.json            # PWA: name, icons, theme_color #0A0F0A
    └── images/                  # Ícones PWA + OG image
```

---

## 6. DESIGN.md — Identidade Visual

```yaml
---
name: Carbon
description: Crédito de carbono para motoristas BYD. Tech limpo, transparência radical, Brasil real.
version: alpha

colors:
  primary: "#0A0F0A"       # Fundo escuro
  surface: "#111911"        # Cards
  accent: "#00D68F"         # Verde-carbono (CTA, destaque)
  accent_glow: "#00D68F33"  # Glow effects
  ink: "#ECFDF1"            # Texto primário
  muted: "#6B8F7B"          # Texto secundário
  positive: "#00D68F"       # Ganhos, up
  neutral: "#F5A623"        # Pendente
  negative: "#FF4757"       # Erro
  border: "#1A2A1A"         # Bordas

typography:
  display:
    font: "Clash Display"
    weight: 600
    usage: "valores grandes (R$ 127,00), hero numbers"
  body:
    font: "Inter"
    weight: 400
    usage: "texto corrido, labels, UI"

rounded:
  card: 12px
  button: 8px
  gauge: 9999px

bans:
  - "Sem gradient text"
  - "Sem glassmorphism"
  - "Sem hero-metric template (big number + small label + gradient)"
  - "Sem side-stripe borders"
  - "Sem border-radius > 16px em cards (exceto gauges circulares)"
```

**Tom visual:** Dark mode com verde-carbono como única cor de destaque. Números grandes e limpos. O dinheiro é o herói visual. Inspiração: Monzo, Linear, Stripe Climate.

---

## 7. Fórmula de Cálculo

```
CRÉDITO (R$) = kWh_elétrico × emissão_evitada_por_kwh × preço_carbono × (1 - comissão)

Onde:
  emissão_evitada_por_kWh =
    (1 / eficiência_elétrica_km_por_kWh) × emissão_gasolina_kg_por_km
    - emissão_rede_eletrica_kg_por_kWh

Valores padrão (config.yaml):
  emissão_gasolina_kg_por_litro: 2.3
  eficiência_gasolina_km_por_litro: 12.0
  emissão_rede_br_kg_por_kWh: 0.062
  preço_carbono_brl_por_tonelada: 45.0
  comissão: 0.15
```

**Exemplo: BYD Seal rodando 1.000 km/mês → ~R$ 6,96/mês → ~R$ 84/ano**

O valor real vem da recorrência e da valorização do carbono (mercado regulado BR projetado a R$ 80-150/tCO₂).

---

## 8. Banco de Dados

```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  pix_key TEXT,
  created_at TIMESTAMP DEFAULT now()
)

vehicles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  vin TEXT UNIQUE NOT NULL,
  model TEXT,
  year INT,
  battery_kwh REAL,
  created_at TIMESTAMP DEFAULT now()
)

trips (
  id UUID PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id),
  date DATE NOT NULL,
  distance_km REAL NOT NULL,
  kwh_used REAL NOT NULL,
  co2_saved_kg REAL NOT NULL,
  source TEXT DEFAULT 'auto',  -- 'auto' | 'manual'
  created_at TIMESTAMP DEFAULT now()
)

credits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  trip_id UUID REFERENCES trips(id) NULL,
  amount_brl REAL NOT NULL,
  co2_kg REAL NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'batched' | 'sold' | 'paid'
  batch_id UUID NULL,
  created_at TIMESTAMP DEFAULT now()
)

payouts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount_brl REAL NOT NULL,
  commission_brl REAL NOT NULL,
  pix_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'processing' | 'paid' | 'failed'
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now()
)

sync_logs (
  id UUID PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id),
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP NULL,
  trips_found INT DEFAULT 0,
  status TEXT DEFAULT 'running'  -- 'running' | 'done' | 'error'
)
```

---

## 9. API Endpoints

### Carbon API (FastAPI)

```
POST   /api/auth/login          # Login BYD (email + senha)
GET    /api/vehicles             # Lista veículos do usuário
POST   /api/vehicles/sync        # Dispara sincronização de viagens
GET    /api/vehicles/{id}/trips  # Histórico de viagens
GET    /api/vehicles/{id}/status # Status em tempo real

GET    /api/credits              # Créditos do usuário
GET    /api/credits/summary      # Resumo: total, mês atual, projeção

POST   /api/payouts/request      # Solicitar resgate (mín R$ 50)
GET    /api/payouts/history      # Histórico de resgates

GET    /api/carbon/price         # Cotação atual do carbono
GET    /api/ranking              # Ranking Brasil (anônimo)

# Fleet (futuro)
GET    /api/fleet/dashboard      # Dashboard multi-veículo
GET    /api/fleet/reports        # Relatórios fiscais
```

### Frontend (Next.js API Routes — proxy)

```
/api/auth/[...nextauth]  # NextAuth (Google OAuth)
/api/carbon/[...path]    # Proxy → Carbon API (server-side, protege VPS)
```

---

## 10. Configuração Externalizada

```yaml
# carbon-api/config.yaml

byd:
  api_timeout_seconds: 30
  sync_interval_hours: 24
  history_days_back: 90

carbon:
  emission_factors:
    gasoline_kg_co2_per_liter: 2.3
    brazil_grid_kg_co2_per_kwh: 0.062
    gasoline_km_per_liter: 12.0
  price_per_ton_brl: 45.0        # Atualizado via /carbon/price
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

---

## 11. Estratégia de Testes

```toml
# pyproject.toml
[tool.pytest.ini_options]
addopts = ["--cov=src/core", "--cov-fail-under=80", "-v"]
```

| Camada | O que testa | Cobertura alvo |
|---|---|---|
| Unit | calculator.py, emission.py, pricing.py | 80%+ |
| Integration | byd_sync (mock pyBYD), payout (mock certificadora), partner_connector | 70%+ |
| E2E | Fluxo completo: sync → calculate → credit → payout | 1 happy path |

**Testes críticos:**
- `test_calculator_zero_trips` — nenhuma viagem → zero crédito
- `test_calculator_rounding` — valores pequenos não arredondam pra zero
- `test_byd_sync_auth_error` — erro de autenticação BYD tratado
- `test_payout_below_minimum` — resgate < R$ 50 rejeitado

---

## 12. Segurança

- Senha BYD: criptografada em repouso (AES-256), nunca em log
- API entre Frontend e Carbon API: API key + HTTPS
- Carbon API NÃO exposta publicamente — só acessível via VPS (firewall)
- Frontend proxy: API routes do Next.js protegem o backend
- Pix key: mascarada no frontend (últimos 4 dígitos visíveis)
- Rate limiting no endpoint de sync (1 por veículo por hora)

---

## 13. Notas de Implementação

### MVP (Fase 1)
- PF apenas
- Conexão BYD via pyBYD (cloud)
- Cálculo de crédito (fórmula aprovada)
- Dashboard com créditos acumulados
- Integração simulada com certificadora (mock inicial)

### Pós-MVP (Fase 2)
- Integração real com Carbonext
- Resgate via Pix
- Ranking Brasil
- Push notifications (Service Worker)

### Frota (Fase 3)
- Ativar módulo `fleet/`
- Dashboard multi-veículo
- Relatórios fiscais e IR
- Gestão de motoristas

---

## 14. Stack & Dependências

### Backend
```
Python 3.13+
FastAPI
pyBYD (async Python client for BYD API)
SQLAlchemy + asyncpg (PostgreSQL)
httpx (chamadas externas)
uv (package manager)
ruff (lint + format)
ty (type checker)
pytest + pytest-cov + pytest-asyncio
```

### Frontend
```
Next.js 16
React 19
Tailwind CSS v4
shadcn/ui
NextAuth.js
PWA (manifest + service worker)
```

---

## 15. Métricas de Sucesso

| Métrica | Alvo MVP (3 meses) |
|---|---|
| Usuários cadastrados | 500 |
| Veículos conectados | 350 |
| Créditos calculados (total R$) | R$ 5.000 |
| Resgates realizados | 20 |
| Receita (comissão 15%) | R$ 750 |
| Churn mensal | < 10% |
