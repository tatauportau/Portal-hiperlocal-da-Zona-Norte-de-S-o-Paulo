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
│   ├── 003_add_email.sql       # Migração: coluna email (copiada de auth.users)
│   ├── 004_vagas_empresas.sql  # Migração: tabela vagas_empresas (vagas patrocinadas por empresas)
│   └── 005_vagas_empresas_localizacao.sql  # Migração: localização vira multi-distrito/bairro (em vez de 1 bairro só)
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

## Vagas Restritas a Cadastrados + Vagas de Empresas (Anuncie sua vaga)

- **Gate de login no menu:** os itens **💼 Vagas**, **🛒 Classificados** e
  **👥 Comunidade** da `.ancora-bar` exigem sessão ativa (Supabase Auth). Sem
  login, o clique abre o modal de login/cadastro com uma mensagem
  contextual (`abrirLogin(aba, mensagem)`, parâmetro `mensagem` opcional)
  em vez de navegar até a seção. **Importante:** esse gate é só no clique
  do menu — o conteúdo dessas seções continua presente no HTML e visível
  normalmente na aba "✨ Edição do Dia" (feed com todas as seções
  misturadas), por decisão consciente de escopo (evitar o trabalho maior de
  ocultar cards individualmente ali). Rastreado via `sessaoAtual` (variável
  global atualizada em `atualizarTopbarAuth`), não uma tabela/flag no
  banco. **Comunidade** ainda não tem seção própria (ver roadmap) — o
  clique, quando logado, só mostra um aviso "em breve". A mensagem exibida
  para **Vagas** também destaca a existência de vagas patrocinadas
  (`MENSAGENS_GATE_LOGIN.vagas`), como chamada para o cadastro.

- **Vagas de empresas (anúncio patrocinado):** empresas publicam vagas pelo
  botão "📢 Anuncie sua vaga" no cabeçalho da seção Vagas. **Desde
  `sql/008_empresas_e_vagas_ownership.sql`, isso exige conta de empresa**
  (ver seção "Contas de empresa" logo abaixo) — deixou de ser publicação
  anônima. O formulário grava na tabela `public.vagas_empresas` (schema
  original em `sql/004_vagas_empresas.sql`, evoluído nas migrações
  seguintes) usando a mesma `anon key`/sessão do Supabase Auth já usada
  pelo cadastro de leitor.
  - **Moderação continua reativa, agora em duas camadas:** a própria
    empresa cancela/edita as próprias vagas (ver "Minhas Vagas" abaixo).
    Pra remoção administrativa de algo indevido/spam que a empresa não
    tirou, `ativa = false` continua sendo o botão-de-pânico do Carlos via
    SQL Editor/Table Editor — independe do `status` do ciclo de vida
    normal (ativa/cancelada/contratada) e não é uma coluna editável pela
    empresa (fora do `grant update` de `sql/008`).
  - **Anti-spam leve:** campo honeypot invisível no formulário
    (`#anuncio-vaga-site`); não há CAPTCHA nem rate limit. Como agora
    exige conta (`sql/008`), o exercício de "poluir" o site fica mais caro
    do que antes (precisa criar conta + confirmar e-mail), mas ainda não
    há verificação real de CNPJ — ver "Contas de empresa" abaixo.
  - **Validação de tamanho espelha as constraints do banco:** `nome_empresa`
    (mín. 2), `titulo_vaga` (mín. 3) e `descricao` (mín. 10) têm `check
    (char_length(...))` em `sql/004_vagas_empresas.sql` — o formulário
    valida os mesmos mínimos em `publicarVagaEmpresa()` (com mensagem
    específica) e via atributo `minlength` nos campos, para o erro aparecer
    de forma clara antes de tentar gravar, em vez de um "não foi possível
    publicar" genérico. Se o Supabase ainda assim recusar por outro motivo,
    o erro real vai pro `console.error` do navegador para facilitar
    diagnóstico.
  - **Título, horário e benefícios (`sql/006_vagas_empresas_horario_beneficios.sql`):**
    - `titulo_vaga` deixou de ser texto livre solto — agora é um `<select>`
      com os cargos mais comuns da região (Atendente, Vendedor(a), Auxiliar
      Administrativo, Motorista, etc., lista fixa no HTML) + opção "Outro
      (especifique)" que revela um campo de texto (`onTituloVagaChange()`).
      O valor final gravado em `titulo_vaga` é sempre texto simples — não
      houve mudança de schema para esse campo, só a forma de preenchê-lo.
    - `horario` (novo, opcional): texto livre curto (ex.: "Seg-Sex, 8h às
      17h"), sem lista pré-definida (decisão consciente — horários variam
      demais para caber em poucas opções fixas).
    - `beneficios` (novo, opcional): checklist de múltipla escolha
      (Vale-transporte, Vale-refeição, Plano de saúde, etc.) + checkbox
      "Outro" que revela `beneficios_outro` (texto livre,
      `onBeneficioOutroChange()`). Ambos ficam null/vazio se a empresa não
      preencher nada.
    - No card, `horario` aparece como mais um item da linha de info (ícone
      ⏰) e `beneficios`/`beneficios_outro` aparecem juntos numa linha
      própria (ícone 🎁, classe `.vaga-beneficios`) — tudo passando por
      `escapeHtml()` como os demais campos vindos do formulário público.
    - `salario` (novo, opcional, `sql/007_vagas_empresas_salario.sql`):
      texto livre alfanumérico de propósito (não é um `number`) — permite
      tanto um valor ("R$ 1.800") quanto algo como "A combinar", sem exigir
      formato fixo. Aparece como badge (💰) ao lado do badge de tipo de
      contrato no card, em vez de entrar na linha de info — mantém os dois
      "fatos rápidos" da vaga (contrato + salário) juntos visualmente.
  - **Exibição:** os cards de empresas aparecem na mesma seção "Vagas de
    Emprego", misturados com as vagas editoriais, com o selo "📢 Vaga
    Patrocinada" (classe `.vaga-patrocinada`) e sempre no topo da lista
    (mais recente primeiro). São carregados via `carregarVagasEmpresas()`
    (client-side, não fazem parte do `index.html` estático gerado por
    `gerar-portau.js` — por isso não se perdem nem se acumulam a cada
    geração diária).
  - **Só aparecem para quem tem cadastro:** diferente das vagas editoriais
    (que continuam visíveis pra todo mundo, inclusive na aba "Edição do
    Dia" — ver seção de gate de login acima), as vagas patrocinadas são
    tratadas como benefício de quem tem conta. `carregarVagasEmpresas()`
    só busca/renderiza se `sessaoAtual` existir; a função roda de novo a
    cada mudança de estado de login (chamada no fim de
    `atualizarTopbarAuth()`), então os cards aparecem assim que a pessoa
    loga e somem assim que desloga, sem precisar recarregar a página.
  - **Segurança:** todo texto vindo do formulário (nome da empresa,
    título, descrição, bairro) passa por `escapeHtml()` antes de virar
    HTML — mesmo exigindo conta, o texto digitado pela empresa continua
    tratado como não confiável (qualquer campo de texto livre é vetor de
    XSS armazenado, com ou sem login). O link de candidatura só é usado como
    `href` se começar com `http://` ou `https://` (`linkCandidaturaSeguro`),
    para não permitir esquemas como `javascript:`.
  - **Cobrança:** gratuito durante um período de testes, **até 19/08/2026**
    (constante `VAGAS_GRATIS_ATE` no `index.html`, também citada no aviso
    exibido dentro do formulário). Depois dessa data, publicar vagas pode
    passar a ser pago — ainda não há gateway de pagamento integrado nem
    modelo de cobrança definido; é decisão futura.
  - **Localização do anúncio (mapa com seleção múltipla):** o formulário
    reaproveita o mesmo mapa D3 + GeoJSON do modal "📍 Bairros" (mesmos
    dados embutidos `#bairros-geo-embutido`/`#bairros-dados-embutido`,
    carregados uma única vez via `garantirDadosMapaBairros()` e
    compartilhados entre os dois modais), num modal próprio
    (`#local-vaga-overlay`) que permite marcar **um ou mais distritos e/ou
    bairros específicos dentro deles** — diferente do modal original de
    Bairros, que é só informativo (links para o Google Earth) e não
    seleciona nada.
    - Estado da seleção fica em `_selecaoLocalVaga = { distritosCompletos:
      Set, bairrosParciais: { DISTRITO: Set } }`. Marcar todos os bairros
      de um distrito (manualmente ou pelo botão "Selecionar o distrito
      inteiro") promove aquele distrito para `distritosCompletos`;
      desmarcar um bairro específico de um distrito completo faz o
      caminho inverso (volta a ser parcial, com os demais bairros ainda
      marcados).
    - Gravado em duas colunas (`sql/005_vagas_empresas_localizacao.sql`):
      `distritos_completos text[]` (distritos inteiros) e
      `bairros_por_distrito jsonb` (`{ "DISTRITO": ["Bairro X", ...] }`,
      só para distritos com seleção parcial). Regra de exibição no card
      (`textoLocalizacaoVaga()`): distrito completo → mostra só o nome do
      distrito; distrito parcial → mostra o nome do distrito seguido dos
      bairros marcados.
    - Alternativa mutuamente exclusiva: campo livre "Outra cidade ou
      bairro" (`localizacao_externa`) para empresa fora da Zona Norte,
      mesmo padrão do campo "bairroOutro" do cadastro de leitor.
    - Para o filtro por subprefeitura (`.sub-btn`) funcionar com vagas que
      têm mais de um distrito/bairro, `data-distrito` e `data-bairro` do
      card viraram listas separadas por vírgula (ex.:
      `data-distrito="SANTANA,TUCURUVI"`) — o handler de clique do filtro
      foi ajustado para dividir por vírgula antes de comparar; cards com
      um único valor (as vagas editoriais, que não mudaram) continuam
      funcionando igual, já que dividir uma string sem vírgula por vírgula
      simplesmente devolve um array de um item.

  ### Contas de empresa (CNPJ) — `sql/008_empresas_e_vagas_ownership.sql`

  Publicar vaga deixou de ser anônimo. Empresa cria conta pelo mesmo
  cadastro de leitor (`#login-form-criar`), marcando o checkbox "Sou uma
  empresa" (`onSouEmpresaChange()`), que revela CNPJ (`formatarCnpj()` +
  validação de dígito verificador em `cnpjValido()`, mod-11 completo) e
  Nome da empresa. `criarConta()` manda `cnpj`/`nome_empresa` crus em
  `options.data` do `signUp()` — **nunca** um `empresa_id` calculado no
  client, porque `raw_user_meta_data` é controlado por quem chama a API; a
  resolução empresa↔usuário só acontece dentro do trigger
  `handle_new_user()` (`security definer`, roda no servidor), que faz um
  `insert ... on conflict (cnpj) do update ... returning id` atômico em
  `public.empresas` e grava o `empresa_id` resultante em `profiles`. Duas
  contas com o mesmo CNPJ caem na mesma empresa automaticamente (útil pra
  mais de uma pessoa da mesma empresa gerenciar vagas) — o formulário
  avisa disso antes de submeter via `checarCnpjExistente()` →
  `empresa_por_cnpj()` (RPC, mesmo padrão do `celular_ja_cadastrado` do
  `sql/002`).

  - **`empresa_id` não é editável depois do cadastro** (fica fora do
    `grant update` de `profiles`, igual `subscription_tier` desde o
    `sql/001`) — ninguém vira empresa depois de já ter conta de leitor
    sem passar pelo trigger de novo.
  - **Risco aceito conscientemente:** não há verificação real do CNPJ
    (Receita Federal, domínio de e-mail, etc.) — qualquer um pode digitar
    um CNPJ que não é dele e entrar como "colega" daquela empresa. Sem
    aprovação prévia também aqui (mesma filosofia do `sql/004`); mitigação
    é a moderação manual que o Carlos já faz.
  - **`perfilAtual`** (variável de módulo em `index.html`) guarda
    `{empresa_id}` do usuário logado, buscado dentro de
    `atualizarTopbarAuth()` (que virou `async`) toda vez que a sessão
    muda. É o que decide se aparece o botão "🏢 Minhas Vagas" no menu do
    usuário e se `abrirAnuncioVaga()` deixa publicar.

  ### Ciclo de vida da vaga: validade, editar, cancelar, contratada

  - **Validade escolhida pelo anunciante:** select "Por quanto tempo a
    vaga fica visível?" com 7/14/21/30 dias (`anuncio-vaga-dias-validade`,
    30 pré-selecionado). Gravado em `dias_validade` (só no `insert`, não é
    editável depois — fora do `grant update`) e `expira_em` é calculado por
    um trigger `before insert` (`calcular_expira_em_vaga()`) — não podia
    ser coluna `generated` porque aritmética `timestamptz + interval` não
    é imutável pro Postgres (depende do `TimeZone` da sessão), mas a
    garantia é a mesma: nunca vem do client, sempre derivado de
    `criado_em + dias_validade`, não tem como dessincronizar. A policy
    pública de select exige `expira_em > now()`, então a vaga some
    sozinha do site sem precisar de cron job nem de ninguém rodar nada.
  - **Dono da vaga:** `criado_por_user_id` (default `auth.uid()`) e
    `empresa_id` (default `minha_empresa_id()`) são preenchidos pelo
    banco, nunca pelo client — `publicarVagaEmpresa()` não envia essas
    colunas. Se uma conta de leitor comum (sem `empresa_id`) tentasse
    inserir, o `not null` de `empresa_id` já barra antes mesmo da RLS
    entrar em jogo.
  - **Editar — só quem criou aquela vaga específica** (pedido explícito,
    não é "qualquer um da empresa"): policy de `update` exige
    `criado_por_user_id = auth.uid()`. A visão de "Minhas Vagas" já é por
    empresa inteira (todo mundo vê todas as vagas da empresa, pra dar
    transparência), mas os botões de ação (`criarCardMinhaVaga()`) só
    aparecem na vaga se `v.criado_por_user_id === sessaoAtual.user.id` —
    editar reaproveita o próprio formulário "Anuncie sua vaga"
    (`iniciarEdicaoVaga()` repopula tudo, inclusive reconstruindo
    `_selecaoLocalVaga` a partir de `distritos_completos`/
    `bairros_por_distrito` e os checkboxes de benefícios) e faz
    `.update()` em vez de `.insert()` (`_editandoVagaId`), sem enviar
    `dias_validade`.
  - **Só dá pra agir enquanto `status = 'ativa'` e não expirou** — a
    própria policy de `update` do banco exige isso (`using (... status =
    'ativa' and expira_em > now())`), então mesmo que alguém tente burlar
    a UI, o banco recusa. Depois de cancelada/contratada/expirada, só
    publicando uma vaga nova.
  - **Cancelar:** exige motivo (`motivo_cancelamento`, mín. 3 caracteres,
    `check` no banco também exige isso quando `status = 'cancelada'`) —
    não apaga a linha, só muda `status`. Formulário inline dentro do
    próprio card em "Minhas Vagas" (mesmo idioma de revelar-ao-clicar do
    `beneficio-outro`).
  - **"Contratado pelo Portau":** pede nota 1–5 (1-péssimo … 5-excelente)
    e descrição da experiência (mín. 10 caracteres) — ambos exigidos pelo
    `check` do banco quando `status = 'contratada'`. **Só uso interno por
    enquanto**, não aparece em lugar nenhum público do site. Consulta útil
    pro Carlos acompanhar:
    `select avg(contratado_nota), count(*) from vagas_empresas where status='contratada';`

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
- ✅ Vagas, Classificados e Comunidade restritos a usuários logados (gate no menu)
- ✅ Empresas podem publicar vagas patrocinadas sem login (formulário público, sem aprovação prévia, gratuito até 19/08/2026)
- 🔲 Cobrança das vagas de empresas após o período de testes (19/08/2026)
- 🔲 Fluxo de pagamento/upgrade para assinante leitor
- 🔲 Chat da comunidade (Firebase ou Netlify DB)
- 🔲 Área comercial para empresas
- 🔲 Mapa no hero substituindo botões
- 🔲 Eventos GA4 por filtro de bairro

---

## Como Retomar em Nova Conversa

Cole este README ou diga ao Claude:
> "Acesse o README do repositório tatauportau/Portal-hiperlocal-da-Zona-Norte-de-S-o-Paulo no GitHub"
