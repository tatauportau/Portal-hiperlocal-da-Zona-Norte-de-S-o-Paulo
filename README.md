# Portau — Portal Hiperlocal da Zona Norte de São Paulo

Portal de notícias hiperlocal que cobre os 18 distritos e 462 bairros da Zona Norte de SP, com atualização automática diária via Claude API.

🌐 **URL:** [portauzn.com.br](https://portauzn.com.br)

---

## Arquitetura

```
├── index.html                  # Portal completo (single-page)
├── data/
│   ├── bairros-por-distrito.json     # 462 bairros organizados por distrito
│   └── distritos-zona-norte.geojson  # Geodados oficiais dos 18 distritos
├── scripts/
│   └── gerar-portau.js         # Script de geração automática de conteúdo
├── netlify/
│   └── functions/
│       ├── analytics.js        # Função serverless para Google Analytics 4
│       └── disparar-portau.js  # Função schedulada que dispara o workflow GitHub
├── netlify.toml                # Configuração Netlify + scheduler
└── .github/
    └── workflows/
        └── portau-diario.yml   # GitHub Actions workflow
```

---

## Fluxo de Atualização Automática

```
Netlify Scheduler (14h Brasília / 17h UTC)
    └── disparar-portau.js
        └── chama GitHub API (workflow_dispatch)
            └── portau-diario.yml (GitHub Actions)
                └── gerar-portau.js
                    ├── Lê index.html atual
                    ├── Chama Claude API (claude-sonnet-4-6)
                    │   └── web_search para notícias reais da Zona Norte
                    │   └── retorna JSON editorial
                    ├── Injeta conteúdo no HTML (substituições cirúrgicas)
                    └── Commita index.html no branch principal
                        └── Netlify deploy automático
```

---

## Variáveis de Ambiente

### GitHub Secrets
| Variável | Descrição |
|----------|-----------|
| `CLAUDE_API_KEY` | Chave da API Anthropic (console.anthropic.com) |

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

---

## Script gerar-portau.js

### O que faz
1. Lê `bairros-por-distrito.json` (462 bairros, 18 distritos)
2. Calcula data/hora no fuso `America/Sao_Paulo`
3. Chama Claude API com `web_search` para buscar notícias reais
4. Recebe JSON editorial e injeta no `index.html` via regex/indexOf
5. Commita o HTML atualizado

### Configurações da API
- **Modelo:** `claude-sonnet-4-6`
- **Max tokens:** 16000
- **Tools:** `web_search_20250305`

### Seções geradas automaticamente
| Seção | Mínimo |
|-------|--------|
| Notícias | 8 (1 destaque + 7 normais) |
| Agenda | 5 eventos |
| Vagas | 4 vagas |
| Política | 3 itens |
| Alertas | 4 itens |
| Fim de semana | 6 eventos (datas futuras) |

### Logs no GitHub Actions
```
[Portau] Buscando conteúdo editorial para DD/MM/YYYY...
[Portau] Cobertura: 18 distritos, 462 bairros.
[Portau] JSON recebido. Aplicando substituições cirúrgicas...
[Portau] Notícias: X
[Portau] Agenda: X
[Portau] Vagas: X
[Portau] Política: X
[Portau] Alertas: X
[Portau] Fim de semana: X
[Portau] Distritos cobertos: ...
[Portau] index.html atualizado com sucesso (XXXXX bytes).
```

---

## index.html — Componentes

### Faixa do ticker (topo fixo)
- Fundo preto com borda amarela
- Mostra títulos das notícias do dia (gerados pelo script)
- Complementa com RSS do G1/Band filtrado por palavras-chave da Zona Norte
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
- Mapa D3.js com GeoJSON de `data/distritos-zona-norte.geojson`
- Cores por subprefeitura
- Clique no distrito mostra lista de bairros com busca

### Analytics (GA4)
- Property ID: `399155331`
- Service Account: `portau-analytics@portau-analytics.iam.gserviceaccount.com`
- Dados via Netlify Function `analytics.js`
- Métricas: usuários ativos, leitores 7 dias, sessões, tempo médio, países, cidades, dispositivos

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

- **Claude API:** ~US$ 1,50 por execução (claude-sonnet-4-6, max_tokens 16000)
- **Custo mensal estimado:** ~US$ 45 (30 execuções/mês)
- **Recarga:** manual em console.anthropic.com → Plans & Billing
- **Ativar recarga automática recomendado** para evitar interrupções

---

## Histórico de Funcionalidades

- ✅ Pipeline automático Claude API → GitHub Actions → Netlify
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
- 🔲 Cadastro de usuários
- 🔲 Chat da comunidade (Firebase ou Netlify DB)
- 🔲 Área comercial para empresas
- 🔲 Mapa no hero substituindo botões
- 🔲 Eventos GA4 por filtro de bairro

---

## Como Retomar em Nova Conversa

Cole este README ou diga ao Claude:
> "Acesse o README do repositório tatauportau/Portal-hiperlocal-da-Zona-Norte-de-S-o-Paulo no GitHub"
