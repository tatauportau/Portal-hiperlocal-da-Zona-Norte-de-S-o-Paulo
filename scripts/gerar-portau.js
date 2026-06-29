#!/usr/bin/env node
/**
 * gerar-portau.js
 * Lê o index.html atual, chama a Claude API com web_search para buscar
 * notícias da Zona Norte de SP do dia, e salva o novo index.html mantendo
 * todo o layout/CSS/globo3D/Waze/Analytics — só atualiza o conteúdo editorial.
 */

const fs = require('fs');
const path = require('path');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
if (!CLAUDE_API_KEY) {
  console.error('Erro: variável CLAUDE_API_KEY não definida.');
  process.exit(1);
}

const INDEX_PATH = path.resolve(__dirname, '..', 'index.html');
const currentHtml = fs.readFileSync(INDEX_PATH, 'utf8');

const today = new Date();
const dd = String(today.getUTCDate()).padStart(2, '0');
const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
const yyyy = today.getUTCFullYear();
const dateLabel = `${dd}/${mm}/${yyyy}`;

const SYSTEM_PROMPT = `Você é o editor-chefe do Portau, jornal digital hiperlocal da Zona Norte de São Paulo.

Sua tarefa: gerar a nova edição do dia do index.html do Portau.

REGRAS ABSOLUTAS:
1. Mantenha INTEGRALMENTE todo o bloco <head> (meta tags, Google Fonts, Google Analytics gtag, todas as tags <style>).
2. Mantenha INTEGRALMENTE todos os scripts JavaScript ao final do <body> (globo 3D, Waze, Analytics, clima, etc.).
3. Atualize APENAS o conteúdo editorial visível: título da edição, data, manchetes, resumos, cards de notícias, seção de vagas, agenda e classificados.
4. Use as notícias reais do dia buscadas via web_search focando em Zona Norte de SP (bairros: Santana, Tucuruvi, Jaçanã, Vila Guilherme, Tremembé, Mandaqui, etc.).
5. Mantenha exatamente as mesmas classes CSS e estrutura HTML dos cards — não invente novos elementos.
6. Retorne SOMENTE o HTML completo, sem blocos de código markdown, sem explicações.`;

const USER_PROMPT = `Data de hoje: ${dateLabel}

Aqui está o index.html atual do Portau:

\`\`\`html
${currentHtml}
\`\`\`

Busque as notícias mais relevantes da Zona Norte de São Paulo para hoje (${dateLabel}) e gere a nova edição completa do index.html, respeitando todas as regras do sistema.`;

async function main() {
  const { default: fetch } = await import('node-fetch');

  console.log(`[Portau] Gerando edição de ${dateLabel}...`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'interleaved-thinking-2025-05-14',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        },
      ],
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: USER_PROMPT,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[Portau] Erro na API (${response.status}): ${err}`);
    process.exit(1);
  }

  const data = await response.json();

  // Extrai o texto HTML da resposta (último bloco de texto)
  const textBlocks = (data.content || []).filter(b => b.type === 'text');
  if (textBlocks.length === 0) {
    console.error('[Portau] A API não retornou texto.');
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  let newHtml = textBlocks[textBlocks.length - 1].text.trim();

  // Remove cerca de markdown caso a API envolva em ```html
  newHtml = newHtml.replace(/^```html\s*/i, '').replace(/\s*```$/, '').trim();

  if (!newHtml.startsWith('<!DOCTYPE') && !newHtml.startsWith('<html')) {
    console.error('[Portau] Resposta inesperada — não parece HTML válido.');
    console.error(newHtml.slice(0, 500));
    process.exit(1);
  }

  fs.writeFileSync(INDEX_PATH, newHtml, 'utf8');
  console.log(`[Portau] index.html atualizado com sucesso (${newHtml.length} bytes).`);
}

main().catch(err => {
  console.error('[Portau] Erro inesperado:', err);
  process.exit(1);
});
