// Busca e filtra RSS do G1 e Band no servidor (sem depender de serviço de
// terceiros como rss2json, que tem limite de requisições por IP e falha
// para visitantes atrás de ad blocker / rede restritiva).
const RSS_FEEDS = [
  'https://g1.globo.com/rss/g1/sp/sao-paulo/',
  'https://rss.bs.vibra.digital/feed.xml?site=portal&size=20',
];

const KEYWORDS = [
  'zona norte','santana','tucuruvi','jaçanã','tremembé','vila guilherme',
  'casa verde','mandaqui','brasilândia','freguesia do ó','limão','parada inglesa',
  'vila medeiros','campo de marte','cantareira','carandiru','cachoeirinha',
  'jardim são paulo','vila nova cachoeirinha','vila aurora'
];

const CACHE_MS = 20 * 60 * 1000; // 20 minutos
let cache = { data: null, ts: 0 };

function extrairTag(bloco, tag) {
  const m = bloco.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  return m[1]
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function parseRSS(xml) {
  const blocos = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  return blocos.map(bloco => ({
    title: extrairTag(bloco, 'title'),
    description: extrairTag(bloco, 'description')
  })).filter(item => item.title);
}

async function buscarFeed(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortauBot/1.0)' } });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseRSS(xml);
  } catch (e) {
    return [];
  }
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=900'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const agora = Date.now();
  if (cache.data && (agora - cache.ts) < CACHE_MS) {
    return { statusCode: 200, headers, body: JSON.stringify(cache.data) };
  }

  try {
    const resultados = await Promise.all(RSS_FEEDS.map(buscarFeed));
    let noticias = [];
    resultados.forEach(itens => {
      const filtradas = itens.filter(item => {
        const texto = (item.title + ' ' + (item.description || '')).toLowerCase();
        return KEYWORDS.some(k => texto.includes(k));
      });
      noticias = noticias.concat(filtradas.map(i => i.title));
    });

    const payload = { noticias };
    cache = { data: payload, ts: agora };

    return { statusCode: 200, headers, body: JSON.stringify(payload) };
  } catch (e) {
    if (cache.data) {
      return { statusCode: 200, headers, body: JSON.stringify(cache.data) };
    }
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, noticias: [] }) };
  }
};
