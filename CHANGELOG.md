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
