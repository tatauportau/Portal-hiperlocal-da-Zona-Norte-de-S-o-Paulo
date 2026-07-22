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
