const { createSign } = require('crypto');

const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID || '543077788';
const SA_EMAIL = process.env.GA_SA_EMAIL;
// A chave deve ser configurada no Netlify como variável de ambiente GA_SA_KEY,
// com as quebras de linha reais substituídas por "\n" literal (padrão comum
// para colar chaves PEM em variáveis de ambiente de uma linha só).
const SA_KEY = (process.env.GA_SA_KEY || '').replace(/\\n/g, '\n');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!SA_EMAIL || !SA_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Credenciais do Google Analytics não configuradas. Defina GA_SA_EMAIL e GA_SA_KEY (e opcionalmente GA_PROPERTY_ID) nas variáveis de ambiente do Netlify.'
      })
    };
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claim  = Buffer.from(JSON.stringify({
      iss: SA_EMAIL,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    })).toString('base64url');

    const unsigned = `${header}.${claim}`;
    const sign = createSign('RSA-SHA256');
    sign.update(unsigned);
    const signature = sign.sign(SA_KEY, 'base64url');
    const jwt = `${unsigned}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    });
    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;
    if (!access_token) throw new Error('Token inválido: ' + JSON.stringify(tokenData));

    const gaH = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };
    const base = `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}`;

    const [rtRes, semanalRes, paisesRes, devRes, cidadesRes] = await Promise.all([
      // Realtime
      fetch(`${base}:runRealtimeReport`, {
        method: 'POST', headers: gaH,
        body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] })
      }),
      // Totais 7 dias
      fetch(`${base}:runReport`, {
        method: 'POST', headers: gaH,
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'averageSessionDuration' }]
        })
      }),
      // Países 7 dias
      fetch(`${base}:runReport`, {
        method: 'POST', headers: gaH,
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 6
        })
      }),
      // Dispositivos 7 dias
      fetch(`${base}:runReport`, {
        method: 'POST', headers: gaH,
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }]
        })
      }),
      // Cidades do Brasil 7 dias
      fetch(`${base}:runReport`, {
        method: 'POST', headers: gaH,
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'city' }],
          metrics: [{ name: 'activeUsers' }],
          dimensionFilter: {
            filter: {
              fieldName: 'country',
              stringFilter: { value: 'Brazil', matchType: 'EXACT' }
            }
          },
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 8
        })
      })
    ]);

    const [rt, semanal, paises_r, dev_r, cidades_r] = await Promise.all([
      rtRes.json(), semanalRes.json(), paisesRes.json(), devRes.json(), cidadesRes.json()
    ]);

    const ativos    = (rt.rows || []).reduce((s, r) => s + parseInt(r.metricValues[0].value), 0);
    const total7d   = semanal.rows?.[0]?.metricValues?.[0]?.value || '0';
    const sessoes7d = semanal.rows?.[0]?.metricValues?.[1]?.value || '0';
    const duracao   = semanal.rows?.[0]?.metricValues?.[2]?.value || '0';

    const paises = (paises_r.rows || [])
      .filter(r => r.dimensionValues[0].value !== '(not set)')
      .map(r => ({ nome: r.dimensionValues[0].value, num: parseInt(r.metricValues[0].value) }));

    const devices = {};
    (dev_r.rows || []).forEach(r => {
      devices[r.dimensionValues[0].value] = parseInt(r.metricValues[0].value);
    });

    const cidades = (cidades_r.rows || [])
      .filter(r => r.dimensionValues[0].value !== '(not set)')
      .map(r => ({ nome: r.dimensionValues[0].value, num: parseInt(r.metricValues[0].value) }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ativos, total7d, sessoes7d, duracao, paises, devices, cidades })
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};
