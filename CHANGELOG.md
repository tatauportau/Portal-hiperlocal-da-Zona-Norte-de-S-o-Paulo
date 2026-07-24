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
