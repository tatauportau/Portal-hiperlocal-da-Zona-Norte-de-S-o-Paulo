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
