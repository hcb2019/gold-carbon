# Gold Carbon — Integração BYD API Real

> **Arquitetura-First** | 18 Jun 2026 | Stack: FastAPI + pyBYD + Supabase + Next.js 16

## 🎯 Objetivo

Substituir os dados **demo (fake)** do backend por integração real com a **BYD Cloud API via pyBYD**, permitindo:
- Leitura de dados reais do veículo (bateria, odômetro, GPS, autonomia)
- Sincronização do histórico real de viagens
- Cálculo real de créditos de carbono baseado em kWh consumidos
- Comandos remotos (travar/destravar, climatização)

## 🏗️ Arquitetura Atual → Nova

```
ANTES (demo)                          DEPOIS (real)
─────────────                         ──────────────
onboard()                             onboard()
  ├─ Cria veículo fake                  ├─ Autentica na BYD Cloud (pyBYD)
  ├─ Gera 30 trips aleatórios           ├─ Busca veículos reais (VIN, modelo)
  └─ Calcula CO₂ estimado               ├─ Sincroniza histórico real de viagens
                                         └─ Calcula CO₂ real (kWh × grid_factor)

GET /vehicles                         GET /vehicles
  └─ Retorna do Supabase                ├─ Retorna do Supabase (cache)
                                         └─ Opcional: refresh da BYD Cloud

GET /vehicles/{id}/trips              GET /vehicles/{id}/trips
  └─ Retorna trips fake                 └─ Retorna trips reais sincronizadas

GET /vehicles/{id}/status             GET /vehicles/{id}/status
  └─ Dados estáticos do banco           ├─ Dados em TEMPO REAL (pyBYD)
                                         ├─ SOC bateria, autonomia, odômetro
                                         └─ Status portas, carregamento, GPS

—                                     POST /vehicles/{id}/commands
                                         ├─ lock / unlock
                                         ├─ start_climate / stop_climate
                                         └─ find_car
```

## 📁 Nova Estrutura de Módulos

```
carbon-api/src/core/
├── byd/                          ← NOVO
│   ├── __init__.py
│   ├── client.py                 # BydService: auth, CRUD, comandos
│   ├── carbon.py                 # CarbonCalculator: fórmula real
│   └── models.py                 # Pydantic models (VehicleReal, TripReal, etc.)
├── db/
│   └── database.py               # (existente, sem alterações)
├── config.py                     # (atualizado: BYD creds criptografadas)
└── router.py                     # (refatorado: endpoints reais)
```

## 🔐 Fluxo de Autenticação BYD

```
Usuário (frontend)
  │ BYD email + password + control_pin
  ▼
POST /api/onboard  ──────────────►  BydService.authenticate()
  │                                    ├─ pyBYD: BydConfig(username, password)
  │                                    ├─ get_vehicles() → lista VINs
  │                                    └─ verify_command_access(vin) → PIN
  │
  ├─ Salva credenciais (wallet_address, criptografado em prod)
  ├─ Salva veículos no Supabase
  ├─ Sincroniza trips (histórico 90 dias)
  └─ Calcula créditos de carbono
```

## 🧮 Fórmula de Carbono (Real)

```
CO₂ evitado (kg) = kWh_consumido × grid_emission_factor

Onde:
  - grid_emission_factor = 0.062 kg CO₂/kWh (Brasil, média nacional)
  - kWh_consumido = distância × 0.15 kWh/km (BYD Dolphin médio)
  
  Simplificado: CO₂ (kg) = km × 0.15 × 0.062

Preço do crédito:
  - R$ 45,00 / tonelada CO₂ (mercado voluntário brasileiro)
  - Comissão Gold Carbon: 15%
  - Valor líquido = CO₂_kg / 1000 × 45 × 0.85
```

## ⚠️ Pitfalls Identificados

1. **pyBYD é alpha** — API pode quebrar. Pin versão. Try/except em toda chamada.
2. **Rate limiting** — BYD Cloud tem limites não documentados. Usar cache (Supabase) entre sincronizações.
3. **Credenciais sensíveis** — Email/senha BYD armazenados em wallet_address. Em produção: criptografar.
4. **Sem API oficial** — BYD pode bloquear acesso a qualquer momento. Fallback para dados cacheados.
5. **MQTT vs HTTP** — pyBYD usa MQTT pra tempo real, HTTP pra sync. Tratar ambos.
6. **Node.js 20 sem WebSocket** — Backend Python não sofre desse problema.
7. **Túnel Cloudflare expira** — API_BASE no frontend precisa ser atualizável.

## 📊 Endpoints — Contrato da API

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/onboard` | JWT | Conectar BYD + sync inicial |
| GET | `/api/vehicles` | JWT | Listar veículos (cache Supabase) |
| GET | `/api/vehicles/{id}/trips` | JWT | Histórico real de viagens |
| GET | `/api/vehicles/{id}/status` | JWT | Dados em tempo real (bateria, GPS) |
| POST | `/api/vehicles/{id}/commands` | JWT | Comando remoto (lock, climate) |
| POST | `/api/vehicles/{id}/sync` | JWT | Forçar sincronização com BYD Cloud |

## 🎨 Frontend — Mudanças

| Página | Antes | Depois |
|--------|-------|--------|
| Dashboard | Números fake, CTA conectar | SOC bateria, autonomia, CO₂ real |
| Viagens | Lista de trips demo | Histórico real com mapa |
| Perfil | BYD conectado (fake) | Status real da conexão, VIN, modelo |
| Novo: Comandos | — | Botões lock/unlock, climatização |

## 🔄 Cronograma de Execução

1. **Módulo BYD** (backend) — core da integração
2. **CarbonCalculator** — fórmula real
3. **Endpoints refatorados** — substituir demo
4. **Comandos remotos** — novo endpoint
5. **Frontend API client** — novos tipos e funções
6. **Dashboard real** — SOC, autonomia
7. **Viagens e Perfil** — dados reais
8. **Teste E2E** — fluxo completo
