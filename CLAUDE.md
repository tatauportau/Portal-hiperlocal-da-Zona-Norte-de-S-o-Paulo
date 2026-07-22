# Instruções para Claude Code neste repositório

Este é o repositório do **Portau** (portauzn.com.br), portal de notícias hiperlocal da Zona Norte de São Paulo. Carlos é o operador único do projeto e trabalha alternando entre Claude Chat, Claude Code e Claude Cowork.

## Regra fixa: registrar mudanças no CHANGELOG.md

Ao final de qualquer sessão de trabalho neste repositório que envolva alteração de código, arquitetura, decisões técnicas relevantes, ou correção de bugs não-triviais, **adicione uma entrada no topo de `CHANGELOG.md`** (logo abaixo do cabeçalho, acima das entradas anteriores), seguindo este formato:

```
## AAAA-MM-DD — Code
- Mudança 1 (arquivo/área afetada)
- Mudança 2
- Decisão relevante, se houver (ex: "optamos por X em vez de Y porque...")
```

Use a data real da sessão. Seja objetivo: o quê mudou e por quê (quando não for óbvio pelo próprio texto). Não é necessário registrar mudanças triviais (ex: typo, formatação).

Esse changelog é consultado no Claude Chat para manter o documento "Sobre o Projeto" (contexto do Project) sincronizado com o estado real do código. Sem essa entrada, mudanças feitas aqui ficam invisíveis para o Chat.

## Outras notas importantes

- **Branch de produção:** `principal` (não `main`).
- **`index.html` é monolítico (~196KB+)** — contém logo base64, GeoJSON e CSS/JS inline. Cuidado ao editar: prefira edições cirúrgicas (str_replace) a reescrever o arquivo inteiro.
- **Arquivos em `.github/workflows/`** não podem ser criados/editados via GitHub MCP (restrição de segurança do GitHub) — Claude Code (terminal, com git normal) ou a interface web do GitHub são os únicos caminhos.
- **Pipeline atual (jul/2026):** `scripts/gerar-portau.js` NÃO chama mais a API da Claude — lê `data/conteudo-manual.json` (preenchido pelo Claude Cowork) e injeta no `index.html` via regex. Não reintroduzir chamada à API sem confirmar com o Carlos.
- Antes de diagnosticar ou alterar o pipeline, sempre confirmar o código-fonte real no repositório — a documentação (README.md, Sobre o Projeto) pode estar desatualizada.
- Commits devem ser frequentes e descritivos (padrão já usado no projeto: prefixo tipo `docs:`, `fix:`, `feat:` + descrição curta em português).
