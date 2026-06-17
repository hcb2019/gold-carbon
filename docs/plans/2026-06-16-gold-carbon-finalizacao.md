# Gold Carbon — Plano de Finalização

> **Para Hermes:** Executar tarefa por tarefa. Cada task é independente e verificável.

**Meta:** App Gold Carbon 100% funcional — login, sincronização BYD, dashboard com dados reais, resgate Pix.

**Status atual:** Landing page pronta. Backend API rodando mas isolado (localhost). Frontend não conecta no backend pelo túnel. Dashboard vazio.

**Stack:** Next.js 16 + FastAPI + Supabase (REST) + pyBYD

---

## FASE 1: Conectividade 🔌

### Task 1.1: Expor backend no túnel
**Problema:** Frontend acessa `localhost:8000` — não funciona no celular.
**Solução:** Criar túnel Cloudflare pra porta 8000 também, e configurar o frontend pra usar a URL pública.

- [ ] Iniciar `cloudflared tunnel --url http://localhost:8000`
- [ ] Atualizar `.env.local` com `NEXT_PUBLIC_API_URL=https://xxx.trycloudflare.com`
- [ ] Testar: abrir dashboard no celular → dados carregam

### Task 1.2: Configurar CORS corretamente
- [ ] Adicionar URL do túnel no `allow_origins` do backend
- [ ] Testar chamada cross-origin do frontend → backend

---

## FASE 2: Autenticação 🔐

### Task 2.1: Configurar Supabase Auth no frontend
- [ ] Instalar `@supabase/ssr` + `@supabase/supabase-js`
- [ ] Criar middleware de sessão (cookies)
- [ ] Criar tela de login (`/login`)
- [ ] Proteger rotas internas (`/dashboard`, `/viagens`, `/creditos`, `/perfil`)

### Task 2.2: Login com Google OAuth
- [ ] Configurar Google OAuth no Supabase Dashboard
- [ ] Adicionar botão "Entrar com Google" na landing
- [ ] Redirecionar para `/dashboard` após login

### Task 2.3: Criar usuário no banco após primeiro login
- [ ] Trigger ou lógica: ao fazer login, criar registro na tabela `users`
- [ ] Associar `user_id` nas requisições ao backend

---

## FASE 3: Backend Real 📡

### Task 3.1: Proteger endpoints com autenticação
- [ ] Extrair token JWT do header `Authorization`
- [ ] Validar token contra Supabase Auth
- [ ] Associar `user_id` em todas as queries

### Task 3.2: Conectar frontend ao backend com auth
- [ ] Enviar token JWT em todas as chamadas `fetchAPI`
- [ ] Testar: usuário logado → vê SEUS dados

### Task 3.3: Criar endpoint de onboarding
- [ ] `POST /api/onboard` — recebe email BYD + senha
- [ ] Salva credenciais (criptografadas) na tabela `users`
- [ ] Dispara sync inicial em background

---

## FASE 4: Sincronização BYD 🚗

### Task 4.1: Testar pyBYD com conta real
- [ ] Instalar pyBYD no ambiente
- [ ] Testar login com credenciais BYD reais
- [ ] Puxar lista de veículos e viagens

### Task 4.2: Implementar sync service
- [ ] `POST /api/sync` — puxa viagens da BYD API
- [ ] Salva veículo na tabela `vehicles`
- [ ] Salva viagens na tabela `trips`
- [ ] Calcula CO₂ evitado para cada viagem
- [ ] Cria registros em `carbon_credits`

### Task 4.3: Agendar sync diário
- [ ] Criar cron job no Hermes: `0 3 * * *` chama `/api/sync` para cada usuário
- [ ] Registrar execuções em `sync_logs`

---

## FASE 5: Dashboard com Dados Reais 📊

### Task 5.1: Dashboard — resumo de créditos
- [ ] Puxar `credits/summary` da API com dados reais
- [ ] Exibir: saldo total (R$), CO₂ evitado (kg), projeção mensal
- [ ] Tratar estados: loading, vazio (sem viagens), erro

### Task 5.2: Dashboard — medidor de CO₂
- [ ] Gauge circular com progresso do mês
- [ ] Meta: 500 kg/mês (ajustável)

### Task 5.3: Dashboard — ranking
- [ ] Puxar `/api/ranking` com dados reais
- [ ] Mostrar posição do usuário + top 10

---

## FASE 6: Páginas Internas 📄

### Task 6.1: Viagens — histórico real
- [ ] Puxar viagens da API com dados reais
- [ ] Lista com: data, distância, kWh, CO₂
- [ ] Estados: loading, vazio (0 viagens), erro

### Task 6.2: Créditos — saldo + resgate
- [ ] Mostrar saldo real em R$
- [ ] Formulário de resgate Pix
- [ ] Validação: mínimo R$ 50
- [ ] Confirmação visual após solicitar

### Task 6.3: Perfil — dados do usuário
- [ ] Nome, email, veículo vinculado
- [ ] Status da conta BYD (conectada/desconectada)
- [ ] Botão "Reconectar BYD"

---

## FASE 7: Polimento ✨

### Task 7.1: RLS no Supabase
- [ ] Políticas: usuário só vê seus próprios dados
- [ ] Testar com dois usuários diferentes

### Task 7.2: Tratamento de erros global
- [ ] Toast de erro no frontend
- [ ] Retry automático em falhas de rede
- [ ] Página 404 customizada

### Task 7.3: Deploy produção
- [ ] Build de produção do frontend
- [ ] Deploy na Vercel
- [ ] Backend com systemd para reinício automático

---

## Ordem de Execução

```
FASE 1 (Conectividade) → FASE 2 (Auth) → FASE 3 (Backend Auth) → FASE 4 (BYD Sync) → FASE 5 (Dashboard) → FASE 6 (Páginas) → FASE 7 (Polimento)
```

**Tempo estimado:** 2-3 horas de execução contínua.
**Entregável:** App funcional — usuário faz login com Google, conecta BYD, vê créditos reais, solicita Pix.

---

Quer que eu comece pela **FASE 1** agora?
