# Changelog — Portau

Registro cronológico de mudanças relevantes feitas no projeto, tanto via Claude Chat quanto via Claude Code. Serve como fonte de verdade para manter o documento "Sobre o Projeto" (Project context do Claude Chat) sincronizado com o estado real do repositório.

## Como usar

- **No Claude Code:** ao final de uma sessão que alterou código, arquitetura, ou tomou alguma decisão relevante, adicione uma entrada nova no topo (formato abaixo).
- **No Claude Chat:** ao final de uma sessão de trabalho, revisamos este changelog junto com a conversa para decidir se o "Sobre o Projeto" precisa de atualização.
- Entradas curtas e objetivas: o quê mudou, por quê (se não for óbvio), e arquivos/áreas afetadas.

## Formato de entrada

```
## AAAA-MM-DD — Origem (Chat/Code)
- Mudança 1
- Mudança 2
```

---

## 2026-09-17 — Cowork

- **Zona eleitoral por bairro + locais de votação (endereço/eleitores) no modal de bairros.** Novo `data/zonas-eleitorais-detalhe.json`, construído a partir do CSV oficial do TSE `eleitorado_local_votacao_2024` (já baixado localmente em `data/tse-raw/`, fora do git) filtrado para São Paulo capital e as 12 zonas eleitorais da Zona Norte: total de eleitores/seções/locais por zona, e para 185 dos 462 bairros canônicos (os que têm pelo menos um local de votação com endereço cadastrado dentro deles) a(s) zona(s) eleitoral(is) confirmada(s) com eleitores por zona e até 4 locais de votação (nome, endereço, eleitores). Os outros 277 bairros não têm local de votação próprio — continuam usando só a lista de zonas do distrito (`zonas-eleitorais-por-distrito.json`), que é mais abrangente mas menos precisa; isso é mostrado explicitamente no modal, não escondido.
- Reconciliação de nome TSE → bairro canônico foi cuidadosa por causa de homônimos entre regiões da cidade (mesmo problema já visto na v1 do ranking, ex. "Telê Santana"): um caso real foi pego e excluído (`Jardim Ipanema (Zona Oeste)` batendo com o `Jardim Ipanema` do Jaraguá, que são lugares diferentes) — qualquer nome TSE com sufixo de outra região entre parênteses foi tratado como não confiável e descartado, não só normalizado. ~10 variantes de grafia (plural/singular, prefixo "Vila"/"Jardim" faltando, acento) foram aceitas manualmente após conferência individual; matches automáticos por similaridade (difflib) que pareciam plausíveis mas eram lugares diferentes (ex. "Vila Brasilândia"→"Vila Basiléia") foram rejeitados.
- `index.html`: cada bairro no modal agora mostra um badge com o número da zona eleitoral já no início do chip (não só no resumo do distrito no fim), e clicar num bairro abre um painel de detalhe abaixo da lista com eleitores confirmados por zona e os locais de votação (nome + endereço). Bairros sem confirmação mostram uma mensagem explícita em vez de dado inventado. Clique continua abrindo o Google Earth normalmente (não removi esse comportamento, só adicionei o painel por cima).
- Mesma ressalva da sessão anterior: edição de `index.html` feita sem ambiente local pra rodar o build, validada só com `node --check` no JS extraído.

## 2026-09-15 — Cowork

- **Painel Política — fotos, presença/faltas e agenda da Câmara.** `data/vereadores-zona-norte.json`: novo campo `foto_url` (imagem oficial de cada vereador, baixada de saopaulo.sp.leg.br e salva em `assets/vereadores/`) e novo campo `atuacao_camara` (percentual de presença, dias presente, faltas justificadas/não justificadas, reconhecimentos quando explicitamente listados no perfil oficial) para os 18 vereadores. Presença é comparada por **percentual**, não por dias absolutos — os contadores do perfil oficial não informam o período que cobrem, e variam muito entre vereadores efetivos (~450+ dias) e prováveis suplentes que assumiram depois (~125-150 dias); comparar por percentual evita penalizar quem está há menos tempo no cargo. Não foram incluídas comissões (menções encontradas eram inconsistentes entre mandato atual e anterior, ou apenas legendas de vídeo — precisa da lista oficial de comissões vigente antes de publicar isso com segurança) nem aprovação/arquivamento de projetos (todas as `atividades` seguem com status `apresentada` do seed inicial; esse dado só existirá depois que houver mudanças de status reais registradas).
- `data/conteudo-manual.json`: novo campo `agenda_camara_semana` com a pauta do plenário da semana (sessão ordinária + extraordinárias, oradores do pequeno/grande expediente). É informação de vida curta (só a semana corrente) — diferente de `atividades`, que acumula histórico. A agenda pessoal de cada vereador no perfil oficial está quase sempre vazia ("não há eventos programados"), por isso a agenda aqui é da Câmara como um todo, não por vereador. **Ainda não está plugada no `gerar-portau.js`** — esse campo existe no JSON mas precisa de um novo ponto de injeção no script de build (e um placeholder correspondente no `index.html`) pra aparecer na `<div id="politica">` automaticamente; ficou fora do escopo desta sessão por mexer no pipeline de build, mais adequado pro Code.
- `index.html`: `montarRankingVereadores()` (JS do ranking) agora renderiza a foto (com fallback pras iniciais se a imagem falhar) e um badge de percentual de presença + faltas não justificadas + lista de reconhecimentos no card expandido de cada vereador. Só usa dados já embutidos por `dados-vereadores-zn` (nenhuma mudança no build script foi necessária pra essa parte). `.rank-avatar` ganhou `overflow:hidden` e a regra pra `img`; `.rank-expand` teve o `max-height` aumentado de 260px pra 420px pra caber o conteúdo novo sem cortar.
- Edição feita direto no `index.html` via Cowork (sem ambiente local pra rodar/testar o build) — validado só com `node --check` no JS extraído, não visualmente no navegador. Vale conferir no site depois do próximo build automático.

## 2026-09-14 — Code

- **Painel Política (vereadores) — build inicial.** Novo ranking "Zona Norte: quem os votos elegeram" na seção #politica, a partir do cruzamento TSE `votacao_secao_2024_SP` + `eleitorado_local_votacao_2024` + zonas eleitorais oficiais da TRE-SP feito nesta sessão. `data/vereadores-zona-norte.json` (novo, persistente) traz os 18 vereadores com ≥20% dos votos vindos da Zona Norte (20% = participação real da região no total de votos a vereador em SP 2024 — 1.022.920 de 5.120.914; testado contra 25% e a distribuição real dos 55 eleitos antes de fechar o corte, não há quebra natural nem em 20% nem em 25%, mas 20% tem justificativa objetiva). Cada vereador traz `votacao_zona_norte` (votos, %, seções eleitorais, bairros de força, votos por subprefeitura) e `votacao_outras_regioes_sp` (Centro/Sul/Leste/Oeste, calculados com a mesma classificação por zona eleitoral). `atividades` começa vazio — task do Cowork pra pesquisa legislativa incremental (indicações/PLs/requerimentos/emendas) é passo futuro, não construído nesta sessão.
- Classificação geográfica por **zona eleitoral**, não por nome de bairro: bairro isolado tem colisão de homônimos entre regiões da cidade (ex: mais de um "Jardim Anhanguera" em SP, um na Zona Norte e outro perto de Santo Amaro) que o TSE nem sempre desambigua — zona eleitoral é geograficamente coesa e foi validada cruzando com a consulta oficial "Bairros da Capital" da TRE-SP (apps.tre-sp.jus.br/zonas_eleitorais).
- `index.html`: ranking com barra animada ao carregar, expande inline (top 3 subprefeituras + atividade mais recente), modal de perfil completo (subprefeituras da ZN abertas + outras 4 regiões em acordeão fechado, drill-down sob demanda + histórico de atividades). Ranking e card "Mapa eleitoral da Zona Norte" ficam fora da `<div id="politica">` de propósito, pra sobreviver à regeneração diária. Modal de bairros (`#bairros-overlay`) ganhou as zonas eleitorais de cada distrito (`data/zonas-eleitorais-por-distrito.json`, novo, embutido como `<script id="bairros-zonas-embutido">` no mesmo padrão já usado pra geo/bairros).
- `scripts/gerar-portau.js`: a cada build, reescreve `<script id="dados-vereadores-zn">` com o estado atual de `data/vereadores-zona-norte.json` (independente do conteúdo editorial manual) — assim o ranking reflete atividades adicionadas por fora do build. O campo `politica` de `data/conteudo-manual.json` (cards institucionais) não foi alterado.
- Repositório local estava 307 commits atrás de `origin/principal` no início desta sessão (o redesenho de layout — clima, login, ticker de trânsito, chips de distrito, vagas com Supabase — não existia no checkout local); sincronizado antes de integrar este trabalho.

## 2026-07-24 — Code

- Grade de distritos no header (Todas/Santana/Casa Verde/.../Perus) virou rolagem horizontal no mobile (`≤900px`) em vez de quebrar em 3 linhas — Carlos relatou que isso empurrava o conteúdo pra baixo demais, sobrando pouco espaço de tela pra navegar (mais perceptível depois do fix de largura acima, já que antes dava pra "trapacear" dando pinça pra ver mais). `.sub-nav-strip` passa a `flex-wrap:nowrap;overflow-x:auto`, mesmo padrão seguro já usado em `.ancora-inner`; desktop sem mudança.
- Logo (56px→40px) e globo interativo (68px→44px) menores no mobile (`≤600px`), mesmo motivo (espaço vertical do header). Canvas do globo ganha `width/height:100%` pra escalar visualmente sem mudar a resolução interna de desenho nem afetar a lógica de rotação por arraste (usa delta de movimento, não posição absoluta). Desktop inalterado.
- Chip de clima abrevia "Zona Norte"→"ZN"; data/hora de atualização (`#clima-update`) vira formato compacto `dd/mm/aa hh:mm` em vez de "Quinta-feira, 23 de julho de 2026 · Gerado às 21:08" — mais um ajuste de espaço vertical no header mobile. Corrigido também em `scripts/gerar-portau.js` (não só no `index.html` de hoje), já que a string longa era regenerada todo dia pelo pipeline. Topbar (elemento separado, não mencionado pelo Carlos) mantém a data por extenso.
- Botões de distrito (`.sub-btn`) e da barra de atalhos (`.ancora-btn`) menores no mobile (`≤600px`), pra ficar alinhado com o resto do header já reduzido acima. Desktop inalterado.
- Carlos gostou da fonte compacta dos botões de distrito e pediu pra estender pro resto do painel — todo o conteúdo de card (títulos, resumo, tags, meta, badges, campos de filtro) vai pra 10px no mobile (`≤600px`), igual `.sub-btn`. Títulos de seção (`.secao-titulo`) e cabeçalhos equivalentes (`.sb-header`, `.cla-grupo-titulo`) mantidos maiores, preservando alguma hierarquia visual. Desktop inalterado.
- **Painel vira lista de manchetes**: cards de Notícias/Política/Alertas mostram só o título por padrão — resumo/impacto/descrição só aparecem ao clicar na manchete (expande/recolhe no lugar, com indicador ⌄). Agenda/Vagas/Classificados não mudaram, já eram compactos. Cards de notícia regular eram `<a href>` envolvendo o card inteiro (clique em qualquer lugar navegava direto pra fonte); viraram `<div>` com "Leia mais" como link de verdade no rodapé — cards em destaque ganharam esse mesmo link real (antes era um `<span>` sem funcionar, bug pré-existente). Atualizado em `scripts/gerar-portau.js` (`buildNoticias`) pra persistir nas próximas atualizações automáticas.
- Painel do mapa de bairros (modal "Bairros da Zona Norte") ajustado no mobile: a coluna de bairros ocupava só 40% da largura do modal (grid fixo 60%/40%, sem stack pra mobile) — nomes como "Condomínio Reserva Cantareira" quebravam em várias linhas numa coluna de ~130-150px, parecendo letras gigantes. `.bairros-corpo` empilha em coluna única abaixo de 600px (mapa em cima, lista embaixo, largura cheia), fontes reduzidas junto. Mesmas classes reusadas nos modais de seleção de local da vaga/minhas vagas/minhas candidaturas — todos corrigidos junto.
- **Banner de instalação do PWA**: Carlos queria chamar atenção pra instalação do app na primeira visita mobile, sem depender do usuário achar os "três pontinhos" do navegador. Banner fixo no rodapé (`#pwa-instalar-banner`, só mobile via UA sniffing + media query `≤640px`) aparece depois que o tour de boas-vindas fecha (ou imediatamente pra quem já viu o tour). No Android/Chrome captura o evento `beforeinstallprompt` e oferece botão "Instalar" que dispara o prompt nativo; no iOS (sem essa API) mostra instrução "Toque em Compartilhar → Adicionar à Tela de Início". Não aparece se já estiver rodando em modo standalone (app já instalado) nem depois de fechado uma vez (`localStorage`, sem re-perguntar). Lógica isolada em `<script>` próprio no fim do `index.html`, hooks mínimos adicionados em `encerrarTour()`/`iniciarTourPortau()` pra disparar a checagem no momento certo.

## 2026-07-23 — Code (4)

- **Causa raiz real do bug de largura/"zoom" no app instalado finalmente encontrada e corrigida** (a entrada "Code" de mais cedo hoje tinha um diagnóstico errado — ticker de notícias — e o fix foi revertido em "Code (2)" por causar problema pior). Causa verdadeira: o rodapé de cada card de vaga (fonte/data/salário, texto vindo de fontes externas como Jooble/Cate, comprimento variável) é `white-space:nowrap` dentro de uma linha flex (`.card-vaga`) sem `min-width:0` — quando o texto é longo o suficiente, o card é forçado mais largo que a tela. Diferente do ticker (contido por `overflow:hidden`) e da barra de atalhos `.ancora-bar` (contida por `overflow-x:auto`) — ambos descartados como causa por bisecção sistemática, removendo cada um da fonte e recarregando do zero —, o card de vaga não tem nenhuma contenção, e é esse tipo de overflow real e sem clipping que faz o Chrome/WebView mobile inflar a largura de todo o "layout viewport" da página, afetando até elementos `position:fixed` (header, ticker) que passavam a renderizar ~1.7x mais largos que a tela real.
- Fix (`index.html`, `.card-vaga` no bloco `<style>`): o texto do rodapé do card agora quebra pra linha própria (`flex-basis:100%`) em vez de forçar tudo numa linha só. Correção fica só no CSS, que o pipeline (`gerar-portau.js`) nunca sobrescreve — sobrevive à atualização automática diária.
- Metodologia nova pra esse tipo de bug (evitar repetir o ciclo de tentativa-erro-revert em produção de sessões anteriores): criada página de diagnóstico isolada (`teste-zoom.html`, removida no fim da sessão) com painel mostrando `innerWidth`/`clientWidth`/`visualViewport`/`devicePixelRatio` ao vivo, testada e confirmada no celular real do Carlos — tanto no Chrome normal quanto no app instalado (`display-mode:standalone`, cenário original do bug) — antes de tocar no `index.html` de produção.
- Descoberta lateral: pra testar em modo standalone sem interferir no app real instalado, foi preciso um `manifest-teste.json` próprio (start_url apontando pra página de teste) — reusar o `manifest.json`/service worker de produção faz o Android instalar um atalho que abre o app real, não a página de teste.

## 2026-07-23 — Code (3)

- Tour de boas-vindas reduzido de 8 para 2 passos (abertura + aviso de cadastro) — Carlos relatou que os 8 passos cansavam na primeira visita.
- Os 6 passos removidos (sub-nav de bairros, notícias, botão Bairros, carro-bar/Waze, globo, vagas) viraram dicas contextuais que aparecem uma única vez, no primeiro clique de cada ponto — não mais empurrados de uma vez no onboarding. Implementado com novo balão `#dica-balao` (mesmo visual do `#tour-balao`, sem overlay de dim para não bloquear a ação normal do clique) e chaves individuais em `localStorage` (`portau_dica_*`) por ponto.
- Textos dos 3 pontos que abrem ação ao clicar (Bairros, carro, globo) ajustados de "instrução antes do clique" pra "confirmação depois do clique", já que agora disparam reativamente.

## 2026-07-23 — Code (2)

- **Revertido** o fix de largura (`corrigirLarguraFixos`) e o `viewport-fit=cover` da entrada anterior: a correção causou um problema pior em produção (conteúdo sobrepondo/quebrando na tela, visto pelo Carlos ao testar no celular). Removido também o botão "Instalar app" do header a pedido dele.
- Estado atual: voltamos ao bug visual original (header/ticker mais largos que a tela em certos contextos), sem o novo problema de sobreposição. Causa raiz identificada (ver entrada anterior) mas o fix aplicado não é seguro como estava — precisa de outra abordagem. **Retomar nesta investigação antes de tentar de novo**, testando com mais cuidado em viewport real antes de publicar.

## 2026-07-23 — Code

- Achada e corrigida a causa raiz do bug de "zoom" no PWA instalado (investigado ao longo de várias sessões, ver entradas de 22/07 abaixo): qualquer elemento `position:fixed` com `left:0;right:0` ou `inset:0` (header, ticker de notícias no topo, todos os modais/overlays) renderizava ~1.64x mais largo que o viewport real. Reproduzido tanto no Android do Carlos quanto num navegador desktop redimensionado, incluindo direto em produção — não é específico de WebAPK/Android. `document.documentElement.clientWidth` sempre reportava o valor certo; só a largura desses elementos fixed vinha errada, e não dependia do conteúdo do ticker (testado isolando).
- Fix: força a largura (e altura, pros overlays em tela cheia) desses elementos via JS usando `clientWidth`/`clientHeight`, recalculando em `load`/`resize`/`orientationchange`/`visualViewport.resize`.
- Removido o badge de debug temporário adicionado pra essa investigação.
- Duas tentativas anteriores (`text-size-adjust:100%` e `viewport-fit=cover`) não resolveram — mantidas no código por serem boas práticas de qualquer forma, mas não eram a causa.

## 2026-07-22 — Code (5)

- Passo de instalação removido do final do tour (ficava cansativo, motivo relatado pelo Carlos); tour voltou aos 8 passos originais.
- Instalação virou um ícone próprio "📲 Instalar app" abaixo do botão Entrar, com balão explicativo no hover/toque — some sozinho quando o PWA já está instalado.
- Ícone do maskable corrigido (fundo azul→branco, ver entrada anterior) resolveu o problema visual, mas o layout/texto grandes e a barrinha de trânsito quebrada no app instalado **continuam** mesmo depois do `text-size-adjust:100%`. Hipótese revisada: não é auto-boost de fonte (o logo/imagens também cresceram, não só texto) — mais provável é a configuração de "Zoom de tela" do Android/Samsung, que escala apps instalados (WebAPK) mas não abas do Chrome. Ainda não confirmado com o Carlos; investigar antes de tentar outro fix de CSS.

## 2026-07-22 — Code (4)

- Corrigidos 2 problemas relatados pelo Carlos após instalar o PWA num Android real:
  - Ícone na tela inicial ilegível: `assets/icons/icon-maskable-512.png` tinha fundo azul, mesma cor do globo do símbolo — o globo sumia visualmente, sobrando só o pin verde. Fundo trocado pra branco.
  - Layout/texto grande demais ao abrir o app instalado (e a barrinha de trânsito "quebrando", texto/emoji do carrinho sobrepondo): bug conhecido do Android WebView/WebAPK que infla fonte automaticamente em modo standalone. Corrigido com `text-size-adjust:100%` no `<html>`.
- Essas duas mudanças só são visíveis depois de: (1) publicar em produção e (2) o app já instalado no celular atualizar — ícone/manifest de PWA instalado não atualiza na hora, pode levar até desinstalar e reinstalar pra garantir.

## 2026-07-22 — Code (3)

- Novo passo final no tour de boas-vindas convidando a instalar o PWA: no Chrome/Android, botão "Instalar" dispara o prompt nativo (`beforeinstallprompt`) direto; no iPhone (Safari não suporta esse evento), mostra instrução manual (Compartilhar > Adicionar à Tela de Início); sem prompt disponível, aponta pro ícone da barra de endereço. Passo é pulado automaticamente se o site já estiver rodando em modo standalone (já instalado). Motivado pelo Carlos ter testado e achado o ícone de instalar padrão do navegador pequeno demais pra ser descoberto sozinho.
- Botão "?" fixo no header (ao lado do "Entrar", sempre visível) pra reabrir o tour quando o usuário quiser — antes só rodava automaticamente na 1ª visita via `localStorage`.
- Bug corrigido durante o teste: como o passo de instalação é o último do array, a lógica de "pular passo automaticamente" (usada quando um elemento-alvo não existe) não conseguia pular esse passo específico por causa da guarda de limite do array — corrigido pra checar a condição de pular antes de renderizar, não só dentro do loop de avanço.

## 2026-07-22 — Code (2)

- Portau agora é instalável como PWA (Progressive Web App): `manifest.json`, `sw.js` e ícones novos em `assets/icons/` (recortados do símbolo globo+pin do logo existente). Motivado por 82% dos acessos ao site serem via celular (GA4).
- Decisão: PWA em vez de app nativo — mesmo fluxo de trabalho (Chat/Code/Cowork, index.html único), sem conta de desenvolvedor nem processo de revisão de loja. Se no futuro for necessário presença na App Store/Play Store, dá pra empacotar esse mesmo PWA com Capacitor sem reescrever do zero.
- Service worker usa network-first pra navegação (garante que o usuário sempre veja a edição do dia mais recente quando online) com fallback pro cache quando offline; assets estáticos (ícones/logo) ficam em cache-first.
- Testado localmente via servidor HTTP (`npx serve`, necessário porque service worker exige contexto seguro — não funciona em `file://`): manifest válido, SW registra e ativa, cache do app shell funciona, fallback offline serve o HTML cacheado corretamente.

## 2026-07-22 — Code

- Tour de boas-vindas com mascote guia: overlay com spotlight guiando por 8 elementos da página (sub-nav de bairros, notícias, botão Bairros, barra de trânsito, globo 3D, vagas, botão Entrar), balão de fala com avatar trocando de pose, dispara só na 1ª visita (`localStorage`). Integrado a `index.html` antes de `</body>`.
- Avatares do mascote (3 poses) extraídos do preview aprovado, redimensionados e comprimidos para PNG separados em `assets/mascote-*.png` (~1.5-1.9KB cada) — não embutidos em base64, seguindo a mesma regra já aplicada ao logo.
- Correção durante o teste: o balão calculava sua posição 300ms após o `scrollIntoView`, tempo insuficiente para scrolls longos (ex: passo do `#vagas`, ~3000px de distância) — o balão ficava fora da tela enquanto o spotlight funcionava normalmente. Delay aumentado para 800ms.

## 2026-07-21 — Chat

- Criação deste CHANGELOG.md para rastrear mudanças feitas tanto pelo Chat quanto pelo Code, permitindo manter o "Sobre o Projeto" atualizado de forma mais confiável.
- Criação do CLAUDE.md na raiz do repo, com a regra fixa de registrar mudanças relevantes de cada sessão do Claude Code neste CHANGELOG.

## 2026-07-20 — Code

- Menu de bairros movido para uma faixa própria abaixo do header (antes sobrepunha o logo em telas estreitas); ajustes de overflow e borda direita.
- Nova tela de Editar Cadastro, com correção de bug em que o formulário vinha pré-preenchido com dado de uma sessão anterior.

## 2026-07-19 — Code

- Sistema de vagas patrocinadas por empresas: contas de empresa (CNPJ), publicação e ciclo de vida da vaga, destaque no feed, seleção múltipla de local, campos de salário/horário/benefícios e contato do responsável pelo anúncio.
- Candidatura de leitores a vagas patrocinadas (com busca/filtro); bloqueio de candidatura à própria vaga da empresa; correção de vazamento de vagas não-ativas da própria empresa no feed geral.
- Correção de recursão infinita de RLS entre as tabelas `vagas_empresas` e `candidaturas_vagas`.
- Painel "Minhas Vagas": filtro por status (Ativas/Expiradas, validade de 1 dia), contador de vagas por filtro, abertura padrão em Ativas.
- Acesso a Vagas, Classificados e Comunidade restrito a usuários logados.
- Cadastro do leitor passa a incluir sexo, data de nascimento e estado civil.
- Ajustes de UX: seletor de local, validação de tamanho da descrição, largura reservada do logo (evita deslocar o menu de bairros), cor do botão "Candidatar-se pelo Portau", barra de busca de vagas.
