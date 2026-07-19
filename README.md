# Portau — Portal Hiperlocal da Zona Norte de São Paulo

Portal de notícias hiperlocal que cobre os 18 distritos e 462 bairros da Zona Norte de SP, com atualização automática diária: o conteúdo editorial é pesquisado pelo Claude Cowork e publicado via pipeline Netlify + GitHub Actions.

🌐 **URL:** [portauzn.com.br](https://portauzn.com.br)

---

## Arquitetura

```
├── index.html                  # Portal completo (single-page)
├── data/
│   ├── bairros-por-distrito.json     # 462 bairros organizados por distrito
│   ├── distritos-zona-norte.geojson  # Geodados oficiais dos 18 distritos
│   └── conteudo-manual.json          # Conteúdo editorial do dia (gerado pelo Claude Cowork)
├── vendor/
│   ├── d3.min.js                # D3.js hospedado localmente (evita bloqueio de CDN externo)
│   └── supabase.min.js          # supabase-js hospedado localmente (mesmo motivo do d3)
├── sql/
│   ├── 001_auth_profiles.sql   # Migração: tabela profiles + RLS + trigger de cadastro
│   ├── 002_add_celular.sql     # Migração: coluna celular + checagem de duplicidade
│   └── 003_add_email.sql       # Migração: coluna email (copiada de auth.users)
├── scripts/
│   └── gerar-portau.js         # Lê data/conteudo-manual.json e injeta no HTML
├── netlify/
│   └── functions/
│       ├── estatisticas.js     # Função serverless para Google Analytics 4 (nome evita filtros de "analytics")
│       ├── live-news.js        # Busca/filtra RSS do G1 e Band no servidor (com cache)
│       └── disparar-portau.js  # Função schedulada que dispara o workflow GitHub
├── netlify.toml                # Configuração Netlify + scheduler
└── .github/
    └── workflows/
        └── portau-diario.yml   # GitHub Actions workflow
```

---

## Fluxo de Atualização Automática

```
Claude Cowork (agendamento próprio, roda sozinho)
    └── pesquisa o conteúdo editorial do dia
        └── gera/commita data/conteudo-manual.json no repositório
            └── Netlify Scheduler (14h Brasília / 17h UTC)
                └── disparar-portau.js
                    └── chama GitHub API (workflow_dispatch)
                        └── portau-diario.yml (GitHub Actions)
                            └── gerar-portau.js
                                ├── Lê data/conteudo-manual.json
                                ├── Injeta conteúdo no HTML (substituições cirúrgicas)
                                └── Commita index.html no branch principal
                                    └── Netlify deploy automático
```

> ⚠️ **Mudança importante (jul/2026):** `gerar-portau.js` **não chama mais a
> API da Claude** (`claude-sonnet-4-6` + `web_search`) para gerar conteúdo.
> Antes, o próprio script pesquisava e gerava o JSON editorial via API a
> cada execução; agora ele só lê `data/conteudo-manual.json`, que é
> pesquisado e commitado separadamente pelo **Claude Cowork** (rodando com
> agendamento próprio, antes do horário do disparo às 14h). Essa mudança
> foi intencional — decisão de deixar a pesquisa via Cowork por enquanto —
> e não por falta de saldo na API (o saldo foi verificado e está ok). Pode
> voltar a ser 100% automatizado via API no futuro, se decidido.

---

## Variáveis de Ambiente

### GitHub Secrets
| Variável | Descrição |
|----------|-----------|
| `CLAUDE_API_KEY` | Chave da API Anthropic (console.anthropic.com). **Não usada atualmente** por `gerar-portau.js` — mantida no repositório para uso futuro, caso a geração de conteúdo volte a ser feita via API em vez do Cowork. |

### Netlify Environment Variables
| Variável | Descrição |
|----------|-----------|
| `GITHUB_PAT` | Personal Access Token GitHub (escopo: workflow) |
| `GA_PRIVATE_KEY` | Chave privada da Service Account Google Analytics |

---

## Scheduler

- **Horário:** 14h00 Brasília (17h00 UTC)
- **Configurado em:** `netlify.toml` → `schedule = "0 17 * * *"`
- **Mecanismo:** Netlify Function `disparar-portau.js` chama GitHub API para disparar o workflow
- **Nota:** esse horário dispara a etapa de *publicação* (injeção do conteúdo no HTML). A etapa de *pesquisa* do conteúdo do dia é feita separadamente pelo Claude Cowork, em horário próprio, antes das 14h — é preciso que `data/conteudo-manual.json` já esteja commitado quando o workflow rodar.

---

## Script gerar-portau.js

### O que faz
1. Lê `data/conteudo-manual.json` (conteúdo editorial do dia, preenchido pelo Claude Cowork)
2. Lê `bairros-por-distrito.json` (462 bairros, 18 distritos) para resolver automaticamente o `distrito` de cada item a partir do campo `bairro`
3. Calcula data/hora no fuso `America/Sao_Paulo`
4. Injeta o conteúdo no `index.html` via substituições cirúrgicas por seção (percorre a árvore de `<div>`s até achar o fechamento correspondente, não é um regex simples)
5. Commita o HTML atualizado

> Não depende mais de nenhuma API externa (nem Claude, nem web_search) — ver aviso na seção "Fluxo de Atualização Automática" acima.

### Seções geradas automaticamente
| Seção | Mínimo |
|-------|--------|
| Notícias | 8 (1 destaque + 7 normais) |
| Agenda | 5 eventos |
| Vagas | 4 vagas |
| Política | 3 itens |
| Alertas | 4 itens |
| Fim de semana | 6 eventos (datas futuras) |

*(Esses mínimos valem para o conteúdo esperado em `data/conteudo-manual.json`; o script em si não impõe um mínimo, apenas injeta o que encontrar.)*

### Logs no GitHub Actions
```
[Portau] Carregando conteudo editorial manual para DD/MM/YYYY...
[Portau] Cobertura: 18 distritos, 462 bairros.
[Portau] Conteudo carregado. Aplicando substituicoes cirurgicas...
[Portau] Noticias: X
[Portau] Agenda: X
[Portau] Vagas: X
[Portau] Politica: X
[Portau] Alertas: X
[Portau] Fim de semana: X
[Portau] index.html atualizado com sucesso (XXXXX bytes).
```

---

## index.html — Componentes

### Faixa do ticker (topo fixo)
- Fundo preto com borda amarela
- Mostra títulos das notícias do dia (gerados pelo script)
- Complementa com RSS do G1/Band filtrado por palavras-chave da Zona Norte (buscado server-side via `live-news.js`, com cache de 20min)
- Velocidade: `20s` no CSS (`.ticker-track animation`)
- Dados: `<div id="portau-ticker-data">titulo1|||titulo2</div>`

### Faixa do clima
- API Open-Meteo (coordenadas de Santana: -23.5025, -46.6283)
- Atualiza a cada 15 minutos
- Mostra temperatura, condição, chuva, vento, alertas

### Barra do trânsito
- Abre modal com Waze LiveMap embed
- Botões de bairro: Santana, Tucuruvi, Jaçanã, Vila Guilherme, Tremembé, Casa Verde, Mandaqui

### Hero
- Título com data e horário de geração
- Botões de filtro por subprefeitura (Todas, Santana, Casa Verde, Vila Maria, Jaçanã, Freguesia, Pirituba, Perus)
- Layout: coluna centralizada (título acima, botões abaixo)

### Feed principal
- Notícias, Agenda, Vagas, Política, Alertas, Classificados
- Filtro por `data-bairro` e `data-distrito` nos cards
- Fim de semana: aparece no topo do feed apenas sexta/sábado/domingo (JavaScript)

### Sidebar
- Bloco "Este fim de semana" (atualizado automaticamente)
- Bloco newsletter

### Globo interativo
- Canvas WebGL com continentes e marcador pulsante em SP
- Duplo clique abre painel Google Analytics 4

### Modal Bairros
- Mapa D3.js (`vendor/d3.min.js`, hospedado localmente) com GeoJSON de `data/distritos-zona-norte.geojson`
- Cores por subprefeitura
- Clique no distrito mostra lista de bairros com busca

### Analytics (GA4)
- Property ID: `399155331`
- Service Account: `portau-analytics@portau-analytics.iam.gserviceaccount.com`
- Dados via Netlify Function `estatisticas.js` (endpoint `/.netlify/functions/estatisticas`, nome escolhido para não conter "analytics" — bloqueadores corporativos filtram esse termo na URL)
- Métricas: usuários ativos, leitores 7 dias, sessões, tempo médio, países, cidades, dispositivos

---

## Cadastro de Usuário (Login)

- **Provedor:** Supabase (Postgres + Auth gerenciada — hash de senha, e-mail
  de confirmação e reset de senha ficam a cargo do Supabase, não há código
  próprio de autenticação).
- **Client-side apenas:** `supabase-js` (vendorizado em `vendor/supabase.min.js`,
  mesmo motivo do `vendor/d3.min.js`) fala direto com o Supabase pelo
  browser. Não há Netlify Function para isso — a `anon key` é segura para
  ficar no client, a segurança vem das políticas RLS do banco.
- **Configuração:** em `index.html`, procurar as constantes `SUPABASE_URL` e
  `SUPABASE_ANON_KEY` (perto de `irWaze`/`SUB_MAP`) e preencher com os
  valores de Project Settings → API do painel Supabase.
- **Schema do banco:** rodar `sql/001_auth_profiles.sql`, `sql/002_add_celular.sql`
  e `sql/003_add_email.sql`, nessa ordem, no SQL Editor do Supabase. Juntos
  criam a tabela `profiles` (nome, bairro, distrito, celular, email,
  `subscription_tier` default `'free'`) com RLS, um trigger que popula o
  perfil automaticamente no cadastro, e um índice único parcial + função
  RPC (`celular_ja_cadastrado`) para bloquear celular duplicado antes de
  criar a conta. `subscription_tier` e `email` não são editáveis pelo
  próprio usuário (só via `service_role key`, num contexto servidor — ainda
  não implementado, ver roadmap).
- **Cadastro de bairro:** campo com autocomplete restrito aos 462 bairros
  da Zona Norte (`data/bairros-por-distrito.json`, validado no submit), com
  um segundo campo livre para quem não mora na região.
- **Celular:** opcional, com máscara `(11) 98765-4321`, gravado só com
  dígitos (pronto para prefixar `55` numa futura integração com WhatsApp).
- **E-mail transacional (SMTP):** o serviço de e-mail embutido do Supabase
  tem limite baixíssimo (poucos e-mails/hora), só serve para teste. Em
  produção está configurado um SMTP próprio via Gmail (Authentication →
  Emails → SMTP Settings, usando uma "Senha de app" do Google, nunca a
  senha normal da conta) — considerar migrar para Resend/Brevo se o volume
  de cadastros crescer.
- **Redirect URLs:** configurado em Authentication → URL Configuration
  (Site URL = `https://portauzn.com.br`, com `http://localhost:PORTA/**`
  também na lista para testes locais) — sem isso, o link do e-mail de
  confirmação tenta redirecionar para um endereço padrão inexistente.
- **Modal de login:** só fecha pelo botão ✕ ou tecla Esc (clique fora foi
  desativado de propósito — um arrastar de mouse pra selecionar texto podia
  disparar o fechamento acidental e perder os dados digitados).
- **Inspeção manual do banco:** o Postgres do Supabase é Postgres de
  verdade — dá pra pegar a connection string em Project Settings → Database
  e plugar no pgAdmin4 (ou outro client) pra consultar as tabelas.
- **Fora de escopo por enquanto:** fluxo de pagamento/upgrade para
  "assinante" e qualquer conteúdo realmente gated por `subscription_tier` —
  o campo já existe no banco, mas nada no site checa essa flag ainda.

---

## Distritos Cobertos

| Subprefeitura | Distritos |
|---------------|-----------|
| Santana/Tucuruvi | Santana, Tucuruvi, Mandaqui |
| Casa Verde/Limão | Casa Verde, Limão, Cachoeirinha |
| Vila Maria/Guilherme | Vila Maria, Vila Guilherme, Vila Medeiros |
| Jaçanã/Tremembé | Jaçanã, Tremembé |
| Freguesia/Brasilândia | Freguesia do Ó, Brasilândia |
| Pirituba/Jaraguá | Pirituba, Jaraguá, São Domingos |
| Perus/Anhanguera | Perus, Anhanguera |

---

## Deploy

- **Plataforma:** Netlify
- **Repositório:** GitHub (branch `principal`)
- **Build:** estático (sem build step, publica diretamente o `index.html`)
- **Domínio:** portauzn.com.br

---

## Custos

- **Geração de conteúdo:** desde jul/2026, feita via Claude Cowork (pesquisa
  e preenchimento de `data/conteudo-manual.json`), e não mais via chamada
  paga à API da Claude a cada execução do workflow.
- **`CLAUDE_API_KEY`:** secret mantido no repositório (GitHub Actions) para
  uso futuro, caso a geração volte a ser feita via API.
- **Custos do modelo anterior** (quando `gerar-portau.js` chamava a API
  diretamente, antes de jul/2026, para referência): ~US$ 1,50 por execução
  (`claude-sonnet-4-6`, max_tokens 16000), ~US$ 45/mês estimado (30
  execuções/mês). Não se aplicam enquanto o pipeline atual (Cowork) estiver
  ativo.

---

## Histórico de Funcionalidades

- ✅ Pipeline automático: Claude Cowork (pesquisa) → GitHub Actions → Netlify (publicação)
- ✅ Ticker de notícias com títulos do dia
- ✅ Widget de clima Open-Meteo
- ✅ Mapa interativo D3.js com GeoJSON oficial
- ✅ Modal Waze trânsito ao vivo
- ✅ Globo 3D interativo com painel GA4
- ✅ Filtro por subprefeitura
- ✅ Bloco "Este fim de semana" dinâmico (aparece no feed sexta/sáb/dom)
- ✅ Cobertura de 462 bairros via bairros-por-distrito.json
- ✅ Scheduler via Netlify Functions (14h Brasília)
- ✅ Topbar com data/hora de geração
- ✅ Cadastro de usuários com login (Supabase Auth)
- ✅ Logo movida de base64 inline para `assets/logo.png` (evita truncamento acidental do HTML)
- 🔲 Fluxo de pagamento/upgrade para assinante
- 🔲 Chat da comunidade (Firebase ou Netlify DB)
- 🔲 Área comercial para empresas
- 🔲 Mapa no hero substituindo botões
- 🔲 Eventos GA4 por filtro de bairro

---

## Como Retomar em Nova Conversa

Cole este README ou diga ao Claude:
> "Acesse o README do repositório tatauportau/Portal-hiperlocal-da-Zona-Norte-de-S-o-Paulo no GitHub"
