#!/usr/bin/env node
/**
 * gerar-portau.js
 * Abordagem cirúrgica: pede à Claude API apenas o conteúdo editorial em JSON,
 * depois injeta no HTML original usando delimitadores de seção.
 * O arquivo resultante tem o tamanho completo do original.
 */

const fs = require('fs');
const path = require('path');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
if (!CLAUDE_API_KEY) {
  console.error('Erro: variável CLAUDE_API_KEY não definida.');
  process.exit(1);
}

const INDEX_PATH = path.resolve(__dirname, '..', 'index.html');
let html = fs.readFileSync(INDEX_PATH, 'utf8');

// Data no fuso horário de Brasília (America/Sao_Paulo)
const tzDate = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric', month: '2-digit', day: '2-digit',
  weekday: 'long',
}).formatToParts(new Date());
const getPart = (type) => tzDate.find(p => p.type === type)?.value ?? '';
const dd = getPart('day');
const mm = getPart('month');
const yyyy = getPart('year');
const diaN = parseInt(dd, 10);
const diaSemana = getPart('weekday');
// Capitaliza primeira letra do dia da semana
const diaSemanaCapit = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
const mesesExt = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const mesExt = mesesExt[parseInt(mm, 10) - 1];
const dateLabel = `${dd}/${mm}/${yyyy}`;
const dataPorExtenso = `${diaSemanaCapit}, ${diaN} de ${mesExt} de ${yyyy}`;
// Formato curto para o hero: "29 de junho"
const dataHero = `${diaN} de ${mesExt}`;

// Hora de geração no fuso de Brasília
const horaGeracao = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date());

// ─── Prompt do sistema ───────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é o editor-chefe do Portau, jornal digital hiperlocal da Zona Norte de São Paulo.

Use a ferramenta web_search para buscar notícias reais e atuais da Zona Norte de SP. Cubra os 18 distritos: Santana, Tucuruvi, Mandaqui, Casa Verde, Limão, Cachoeirinha, Vila Maria, Vila Guilherme, Vila Medeiros, Jaçanã, Tremembé, Freguesia do Ó, Brasilândia, Pirituba, Jaraguá, São Domingos, Perus, Anhanguera. Tente distribuir as notícias entre diferentes subprefeituras (Santana, Casa Verde, Vila Maria, Jaçanã-Tremembé, Freguesia do Ó, Pirituba, Perus).

Retorne EXCLUSIVAMENTE um objeto JSON válido, sem nenhum texto antes ou depois, sem blocos de código markdown, sem comentários. O JSON deve ter exatamente esta estrutura:

{
  "data_display": "string — data por extenso, ex: Segunda-feira, 29 de junho de 2026",
  "data_curta": "string — ex: 29/06/2026",
  "noticias": [
    {
      "destaque": true,
      "pill": "string — ex: 🚨 Alerta de Saúde",
      "tag_categoria": "tag-seg",
      "tag_label": "Segurança",
      "tag_bairro": "📍 Santana",
      "bairro": "string — nome exato do distrito, ex: Santana",
      "titulo": "string",
      "resumo": "string",
      "fonte": "string",
      "hora": "string — ex: Hoje, 09h15",
      "url": "string ou #",
      "icone": "🔒",
      "icone_classe": "ic-seg"
    }
  ],
  "agenda": [
    {
      "dia": "string — ex: 29",
      "mes": "string — ex: Jun",
      "cor_fundo": "string — ex: #E65100",
      "bairro": "string — nome exato do distrito, ex: Santana",
      "titulo": "string",
      "hora": "string",
      "local": "string",
      "descricao": "string",
      "gratuito": true,
      "preco": "string ou null",
      "url": "string ou #"
    }
  ],
  "vagas": [
    {
      "icone": "string",
      "titulo": "string",
      "empresa": "string",
      "bairro": "string",
      "requisitos": "string",
      "tipo": "CLT",
      "fonte": "string",
      "dias_atras": "string"
    }
  ],
  "politica": [
    {
      "orgao": "string — ex: 🚇 Governo do Estado de SP",
      "bairro": "string — nome exato do distrito, ex: Santana",
      "titulo": "string",
      "impacto": "string",
      "status": "string",
      "fonte": "string"
    }
  ],
  "alertas": [
    {
      "tipo": "ok",
      "emoji": "☀️",
      "titulo": "string",
      "desc": "string",
      "meta": "string"
    }
  ],
  "resumo_sidebar": {
    "n_noticias": 4,
    "n_eventos": 4,
    "n_vagas": 4,
    "n_politica": 2,
    "n_alertas": 3,
    "n_classificados": 6
  }
}

Para "tag_categoria" use: "tag-seg" (segurança/saúde), "tag-edu" (educação/zeladoria), "tag-mob" (mobilidade), "tag-not" (geral).
Para "icone_classe" use: "ic-seg", "ic-edu", "ic-mob", "ic-eco".
Para "tipo" de alerta use: "ok" (positivo), "info" (informativo), "neutro" (neutro/obras).
Para "bairro" use o nome exato do distrito (ex: "Santana", "Vila Medeiros", "Freguesia do Ó"). Use apenas um distrito por item, mesmo que o conteúdo abranja vários.
Inclua ao menos 4 notícias (1 destaque + 3 normais), 3 agenda, 4 vagas, 2 política, 3 alertas.`;

const USER_PROMPT = `Hoje é ${dataPorExtenso} (${dateLabel}). Busque as notícias mais relevantes da Zona Norte de São Paulo e retorne o JSON da edição de hoje.`;

// ─── Construtores de HTML por seção ─────────────────────────────────────────

function buildNoticias(noticias) {
  const count = noticias.length;
  let html = `  <div class="secao" id="noticias">
    <div class="secao-header">
      <div class="secao-titulo"><span class="barra barra-not"></span>Notícias</div>
      <span class="secao-count">${count} hoje</span>
    </div>\n`;

  for (const n of noticias) {
    if (n.destaque) {
      html += `
    <div class="card-noticia destaque" data-bairro="${n.bairro || ''}">
      <div class="destaque-pill">${n.pill || '⭐ Destaque'}</div>
      <div class="card-tags">
        <span class="tag ${n.tag_categoria}">${n.tag_label}</span>
        <span class="tag-bairro">${n.tag_bairro}</span>
      </div>
      <div class="card-titulo">${n.titulo}</div>
      <div class="card-resumo">${n.resumo}</div>
      <div class="card-footer">
        <div class="card-meta"><span>${n.fonte}</span><span class="dot3"></span><span>${n.hora}</span></div>
        <span class="card-link">Leia mais →</span>
      </div>
    </div>\n`;
    } else {
      html += `
    <a class="card-noticia" href="${n.url || '#'}" target="_blank" data-bairro="${n.bairro || ''}">
      <div class="card-icone ${n.icone_classe}">${n.icone}</div>
      <div>
        <div class="card-tags"><span class="tag ${n.tag_categoria}">${n.tag_label}</span><span class="tag-bairro">${n.tag_bairro}</span></div>
        <div class="card-titulo">${n.titulo}</div>
        <div class="card-resumo">${n.resumo}</div>
        <div class="card-footer">
          <div class="card-meta"><span>${n.fonte}</span><span class="dot3"></span><span>${n.hora}</span></div>
          <span class="card-link">Leia mais →</span>
        </div>
      </div>
    </a>\n`;
    }
  }
  html += `  </div>`;
  return html;
}

function buildAgenda(agenda, dataCurta) {
  const [diaAtual] = dataCurta.split('/');
  const count = agenda.length;
  let html = `  <!-- AGENDA -->
  <div class="secao" id="agenda">
    <div class="secao-header">
      <div class="secao-titulo"><span class="barra barra-age"></span>Agenda de Hoje</div>
      <span class="secao-count">${count} eventos</span>
    </div>\n`;

  for (const e of agenda) {
    const gratuito = e.gratuito || !e.preco;
    const valorHtml = gratuito
      ? `<span class="evento-valor valor-gratis">Gratuito</span>`
      : `<span class="evento-valor valor-pago">${e.preco}</span>`;
    html += `
    <a class="card-evento" href="${e.url || '#'}" target="_blank" data-bairro="${e.bairro || ''}">
      <div class="evento-data" style="background:${e.cor_fundo};"><span class="evento-dia">${e.dia || diaAtual}</span><span class="evento-mes">${e.mes}</span></div>
      <div>
        <div class="evento-titulo">${e.titulo}</div>
        <div class="evento-info"><span>${e.hora ? '⏰ ' + e.hora : ''}</span><span>📍 ${e.local}</span><span>${e.descricao}</span></div>
        ${valorHtml}
      </div>
    </a>\n`;
  }
  html += `  </div>`;
  return html;
}

function buildVagas(vagas) {
  const count = vagas.length;
  let html = `  <!-- VAGAS -->
  <div class="secao" id="vagas">
    <div class="secao-header">
      <div class="secao-titulo"><span class="barra barra-vag"></span>Vagas de Emprego</div>
      <span class="secao-count">${count} vagas</span>
    </div>\n`;

  for (const v of vagas) {
    html += `
    <div class="card-vaga" data-bairro="${v.bairro || ''}">
      <div class="vaga-icone">${v.icone}</div>
      <div style="flex:1">
        <div class="vaga-titulo">${v.titulo}</div>
        <div class="vaga-info"><span>🏢 ${v.empresa}</span><span>📍 ${v.bairro}</span><span>${v.requisitos}</span></div>
        <div style="margin-top:6px;"><span class="vaga-badge">${v.tipo}</span></div>
      </div>
      <div style="font-size:11px;color:var(--cinza-m);white-space:nowrap;">${v.fonte} · ${v.dias_atras}</div>
    </div>\n`;
  }
  html += `  </div>`;
  return html;
}

function buildPolitica(politica) {
  const count = politica.length;
  let html = `  <!-- POLÍTICA -->
  <div class="secao" id="politica">
    <div class="secao-header">
      <div class="secao-titulo"><span class="barra barra-pol"></span>Política Regional</div>
      <span class="secao-count">${count} itens</span>
    </div>\n`;

  for (const p of politica) {
    html += `
    <div class="card-pol" data-bairro="${p.bairro || ''}">
      <div class="pol-orgao">${p.orgao}</div>
      <div class="pol-titulo">${p.titulo}</div>
      <div class="pol-impacto">${p.impacto}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <span class="pol-status">${p.status}</span>
        <span style="font-size:12px;color:var(--cinza-m);">${p.fonte}</span>
      </div>
    </div>\n`;
  }
  html += `  </div>`;
  return html;
}

function buildAlertas(alertas) {
  const count = alertas.length;
  let html = `  <!-- ALERTAS -->
  <div class="secao" id="alertas">
    <div class="secao-header">
      <div class="secao-titulo"><span class="barra barra-dad"></span>Dados & Alertas</div>
      <span class="secao-count">${count} itens</span>
    </div>\n`;

  for (const a of alertas) {
    html += `
    <div class="alerta ${a.tipo}">
      <div style="font-size:24px;flex-shrink:0;">${a.emoji}</div>
      <div>
        <div class="alerta-titulo">${a.titulo}</div>
        <div class="alerta-desc">${a.desc}</div>
        <div class="alerta-meta">${a.meta}</div>
      </div>
    </div>\n`;
  }
  html += `  </div>`;
  return html;
}

function buildResumoSidebar(r, dataCurta) {
  const [dia, mes] = dataCurta.split('/');
  return `  <div class="resumo-box">
    <div class="resumo-titulo">📋 Edição de hoje · ${dia}/${mes}</div>
    <div class="resumo-linha"><span>📰 Notícias</span><span class="resumo-n">${r.n_noticias}</span></div>
    <div class="resumo-linha"><span>🗓️ Eventos</span><span class="resumo-n">${r.n_eventos}</span></div>
    <div class="resumo-linha"><span>💼 Vagas</span><span class="resumo-n">${r.n_vagas}</span></div>
    <div class="resumo-linha"><span>🏛️ Política</span><span class="resumo-n">${r.n_politica}</span></div>
    <div class="resumo-linha"><span>⚠️ Alertas</span><span class="resumo-n">${r.n_alertas}</span></div>
    <div class="resumo-linha"><span>🛒 Classificados</span><span class="resumo-n">${r.n_classificados}</span></div>
  </div>`;
}

// ─── Substituição cirúrgica usando regex por seção ───────────────────────────

function replaceSection(html, id, newContent) {
  // Captura desde <div class="secao" id="id"> até o </div> de fechamento correspondente
  const open = `<div class="secao" id="${id}">`;
  const start = html.indexOf(open);
  if (start === -1) {
    console.warn(`[Portau] Seção #${id} não encontrada no HTML — pulando.`);
    return html;
  }

  let depth = 0;
  let i = start;
  while (i < html.length) {
    if (html[i] === '<') {
      if (html.startsWith('<div', i)) depth++;
      else if (html.startsWith('</div>', i)) {
        depth--;
        if (depth === 0) {
          const end = i + '</div>'.length;
          return html.slice(0, start) + newContent + html.slice(end);
        }
      }
    }
    i++;
  }
  console.warn(`[Portau] Não foi possível encontrar o fechamento da seção #${id}.`);
  return html;
}

function replaceResumoSidebar(html, newContent) {
  const open = '<div class="resumo-box">';
  const close = '</div>';
  const start = html.indexOf(open);
  if (start === -1) {
    console.warn('[Portau] resumo-box não encontrado — pulando sidebar.');
    return html;
  }
  let depth = 0;
  let i = start;
  while (i < html.length) {
    if (html[i] === '<') {
      if (html.startsWith('<div', i)) depth++;
      else if (html.startsWith('</div>', i)) {
        depth--;
        if (depth === 0) {
          const end = i + close.length;
          return html.slice(0, start) + newContent + html.slice(end);
        }
      }
    }
    i++;
  }
  return html;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { default: fetch } = await import('node-fetch');

  console.log(`[Portau] Buscando conteúdo editorial para ${dateLabel}...`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: USER_PROMPT }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[Portau] Erro na API (${response.status}): ${err}`);
    process.exit(1);
  }

  const data = await response.json();
  const textBlocks = (data.content || []).filter(b => b.type === 'text');
  if (textBlocks.length === 0) {
    console.error('[Portau] A API não retornou texto.');
    process.exit(1);
  }

  let rawText = textBlocks[textBlocks.length - 1].text.trim();

  // Remove cerca de markdown ```json ... ```
  rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();

  // Extrai JSON a partir do primeiro {
  const jsonStart = rawText.indexOf('{');
  if (jsonStart === -1) {
    console.error('[Portau] JSON não encontrado na resposta.');
    console.error(rawText.slice(0, 500));
    process.exit(1);
  }
  rawText = rawText.slice(jsonStart);

  let editorial;
  try {
    editorial = JSON.parse(rawText);
  } catch (e) {
    console.error('[Portau] Falha ao parsear JSON:', e.message);
    console.error(rawText.slice(0, 800));
    process.exit(1);
  }

  const dataCurta = editorial.data_curta || dateLabel;
  const dataDisplay = editorial.data_display || dataPorExtenso;

  console.log('[Portau] JSON recebido. Aplicando substituições cirúrgicas...');

  // Atualiza <title>
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>Portau — Edição do Dia · ${dataCurta}</title>`
  );

  // Atualiza topbar (data por extenso)
  html = html.replace(
  /<strong>[^<]*<\/strong>/,
  `<strong>${dataPorExtenso} · Gerado às ${horaGeracao}</strong>`
);

  // Atualiza hero <h1>Zona Norte, 28 de junho</h1>
 html = html.replace(
  /<h1>Zona Norte,[\s\S]*?<\/h1>/,
  `<h1>Zona Norte, ${dataHero} <span style="font-size:0.5em; opacity:0.7; font-weight:400">· ${horaGeracao}</span></h1>`
);

  // Substitui seções editoriais
  if (editorial.noticias?.length) {
    html = replaceSection(html, 'noticias', buildNoticias(editorial.noticias));
  }
  if (editorial.agenda?.length) {
    html = replaceSection(html, 'agenda', buildAgenda(editorial.agenda, dataCurta));
  }
  if (editorial.vagas?.length) {
    html = replaceSection(html, 'vagas', buildVagas(editorial.vagas));
  }
  if (editorial.politica?.length) {
    html = replaceSection(html, 'politica', buildPolitica(editorial.politica));
  }
  if (editorial.alertas?.length) {
    html = replaceSection(html, 'alertas', buildAlertas(editorial.alertas));
  }
  if (editorial.resumo_sidebar) {
    html = replaceResumoSidebar(html, buildResumoSidebar(editorial.resumo_sidebar, dataCurta));
  }

  fs.writeFileSync(INDEX_PATH, html, 'utf8');
  console.log(`[Portau] index.html atualizado com sucesso (${html.length} bytes).`);
}

main().catch(err => {
  console.error('[Portau] Erro inesperado:', err);
  process.exit(1);
});
