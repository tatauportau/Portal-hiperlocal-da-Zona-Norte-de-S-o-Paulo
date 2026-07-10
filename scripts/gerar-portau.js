#!/usr/bin/env node
/**
 * gerar-portau.js
 * Le o conteudo editorial de data/conteudo-manual.json (preenchido a mao)
 * e injeta no HTML original usando delimitadores de secao.
 * Nao depende mais de nenhuma API externa.
 */
const fs = require('fs');
const path = require('path');
const INDEX_PATH = path.resolve(__dirname, '..', 'index.html');
let html = fs.readFileSync(INDEX_PATH, 'utf8');

// ─── Bairros por distrito (462 bairros, 18 distritos) ─────────────────────────
const BAIRROS_PATH = path.resolve(__dirname, '..', 'data', 'bairros-por-distrito.json');
const BAIRROS_POR_DISTRITO = JSON.parse(fs.readFileSync(BAIRROS_PATH, 'utf8'));
const DISTRITO_KEYS = Object.keys(BAIRROS_POR_DISTRITO);

function normalizar(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Mapa reverso: bairro (ou distrito) normalizado -> nome exato do distrito
const BAIRRO_TO_DISTRITO = {};
for (const distrito of DISTRITO_KEYS) {
  BAIRRO_TO_DISTRITO[normalizar(distrito)] = distrito;
  for (const bairro of BAIRROS_POR_DISTRITO[distrito]) {
    BAIRRO_TO_DISTRITO[normalizar(bairro)] = distrito;
  }
}
function resolverDistrito(nomeBairro) {
  return BAIRRO_TO_DISTRITO[normalizar(nomeBairro)] || null;
}

// Data no fuso horario de Brasilia (America/Sao_Paulo)
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
const diaSemanaCapit = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
const mesesExt = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const mesExt = mesesExt[parseInt(mm, 10) - 1];
const dateLabel = `${dd}/${mm}/${yyyy}`;
const dataPorExtenso = `${diaSemanaCapit}, ${diaN} de ${mesExt} de ${yyyy}`;
const dataHero = `${diaN} de ${mesExt}`;
// Hora de geracao no fuso de Brasilia
const horaGeracao = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date());
// Dia da semana numerico em Brasilia (0=dom, 5=sex, 6=sab)
const diaSemanaNum = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getDay();
const ehFimDeSemana = diaSemanaNum === 0 || diaSemanaNum === 5 || diaSemanaNum === 6;

// ─── Construtores de HTML por secao ─────────────────────────────────────
function buildNoticias(noticias) {
  const count = noticias.length;
  let html = `  <div class="secao" id="noticias">
    <div class="secao-header">
      <div class="secao-titulo"><span class="barra barra-not"></span>Noticias</div>
      <span class="secao-count">${count} hoje</span>
    </div>\n`;
  for (const n of noticias) {
    const distrito = resolverDistrito(n.bairro) || '';
    if (n.destaque) {
      html += `
    <div class="card-noticia destaque" data-bairro="${n.bairro || ''}" data-distrito="${distrito}">
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
    <a class="card-noticia" href="${n.url || '#'}" target="_blank" data-bairro="${n.bairro || ''}" data-distrito="${distrito}">
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
    const distrito = resolverDistrito(e.bairro) || '';
    const gratuito = e.gratuito || !e.preco;
    const valorHtml = gratuito
      ? `<span class="evento-valor valor-gratis">Gratuito</span>`
      : `<span class="evento-valor valor-pago">${e.preco}</span>`;
    html += `
    <a class="card-evento" href="${e.url || '#'}" target="_blank" data-bairro="${e.bairro || ''}" data-distrito="${distrito}">
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
    const distrito = resolverDistrito(v.bairro) || '';
    html += `
    <div class="card-vaga" data-bairro="${v.bairro || ''}" data-distrito="${distrito}">
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
  let html = `  <!-- POLITICA -->
  <div class="secao" id="politica">
    <div class="secao-header">
      <div class="secao-titulo"><span class="barra barra-pol"></span>Politica Regional</div>
      <span class="secao-count">${count} itens</span>
    </div>\n`;
  for (const p of politica) {
    const distrito = resolverDistrito(p.bairro) || '';
    html += `
    <div class="card-pol" data-bairro="${p.bairro || ''}" data-distrito="${distrito}">
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

function buildTickerNoticias(noticias) {
  const itens = noticias.map(n => `${n.titulo}::${n.url || '#'}`).join('|||');
  return `<div id="portau-ticker-data" style="display:none">${itens}</div>`;
}

function buildFimDeSemana(items) {
  let html = `  <div class="sb-card" id="fim-de-semana-card">
    <div class="sb-header">🎉 Este fim de semana</div>\n`;
  for (const item of items) {
    html += `    <div class="sb-item">
      <div style="font-size:20px;">${item.emoji}</div>
      <div><div class="sb-titulo">${item.titulo}</div><div class="sb-sub">${item.info}</div></div>
    </div>\n`;
  }
  html += `  </div>`;
  return html;
}

// ─── Substituicao cirurgica usando regex por secao ──────────────────────────
function replaceSection(html, id, newContent) {
  const open = `<div class="secao" id="${id}">`;
  const start = html.indexOf(open);
  if (start === -1) {
    console.warn(`[Portau] Secao #${id} nao encontrada no HTML — pulando.`);
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
  console.warn(`[Portau] Nao foi possivel encontrar o fechamento da secao #${id}.`);
  return html;
}

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`[Portau] Carregando conteudo editorial manual para ${dateLabel}...`);
  console.log(`[Portau] Cobertura: ${DISTRITO_KEYS.length} distritos, ${Object.values(BAIRROS_POR_DISTRITO).reduce((s, l) => s + l.length, 0)} bairros.`);

  const CONTEUDO_PATH = path.resolve(__dirname, '..', 'data', 'conteudo-manual.json');
  if (!fs.existsSync(CONTEUDO_PATH)) {
    console.error(`[Portau] Arquivo nao encontrado: ${CONTEUDO_PATH}`);
    console.error('[Portau] Preencha data/conteudo-manual.json com o conteudo do dia antes de rodar este script.');
    process.exit(1);
  }

  let editorial;
  try {
    editorial = JSON.parse(fs.readFileSync(CONTEUDO_PATH, 'utf8'));
  } catch (e) {
    console.error('[Portau] Falha ao parsear data/conteudo-manual.json:', e.message);
    process.exit(1);
  }

  const dataCurta = editorial.data_curta || dateLabel;
  console.log('[Portau] Conteudo carregado. Aplicando substituicoes cirurgicas...');
  console.log(`[Portau] Noticias: ${editorial.noticias?.length || 0}`);
  console.log(`[Portau] Agenda: ${editorial.agenda?.length || 0}`);
  console.log(`[Portau] Vagas: ${editorial.vagas?.length || 0}`);
  console.log(`[Portau] Politica: ${editorial.politica?.length || 0}`);
  console.log(`[Portau] Alertas: ${editorial.alertas?.length || 0}`);
  console.log(`[Portau] Fim de semana: ${editorial.fim_de_semana?.length || 0}`);

  // Atualiza <title>
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>Portau — Edicao do Dia · ${dataCurta}</title>`
  );
  // Atualiza topbar
  html = html.replace(
    /<strong>[^<]*<\/strong>/,
    `<strong>${dataPorExtenso} · Gerado às ${horaGeracao}</strong>`
  );
  // Atualiza hero h1
  html = html.replace(
    /<h1>Zona Norte,[\s\S]*?<\/h1>/,
    `<h1>Zona Norte, ${dataHero} <span style="font-size:0.5em; opacity:0.7; font-weight:400">· ${horaGeracao}</span></h1>`
  );

  // Substitui secoes editoriais
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

  // Atualiza bloco fim de semana na sidebar
  if (editorial.fim_de_semana?.length) {
    html = html.replace(
      /<div class="sb-card" id="fim-de-semana-card">[\s\S]*?<\/div>\s*<\/div>/,
      buildFimDeSemana(editorial.fim_de_semana)
    );
  }
  // Atualiza ticker com titulos das noticias do dia
  if (editorial.noticias?.length) {
    html = html.replace(
      /<div id="portau-ticker-data"[^>]*>[\s\S]*?<\/div>/,
      buildTickerNoticias(editorial.noticias)
    );
  }
  // Marca visibilidade do bloco fim de semana (sexta=5, sabado=6, domingo=0)
  if (ehFimDeSemana) {
    html = html.replace(
      'id="fim-de-semana-card"',
      'id="fim-de-semana-card" data-fds="true"'
    );
  }

  fs.writeFileSync(INDEX_PATH, html, 'utf8');
  console.log(`[Portau] index.html atualizado com sucesso (${html.length} bytes).`);
}

main().catch(err => {
  console.error('[Portau] Erro inesperado:', err);
  process.exit(1);
});
