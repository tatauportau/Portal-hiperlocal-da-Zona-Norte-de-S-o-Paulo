// Netlify Function — Analytics sem google-auth-library
// Usa JWT manual igual ao painel do globo

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const GA_PROPERTY_ID = '399155331';
    const SA_EMAIL = 'portau-analytics@portau-analytics.iam.gserviceaccount.com';
    const SA_KEY = process.env.GA_PRIVATE_KEY || '';

    // ── JWT ──────────────────────────────────────────
    const { createSign } = require('crypto');

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

    // Formata a chave PEM corretamente
    let pem = SA_KEY.replace(/\\n/g, '\n').trim();
    if (!pem.startsWith('-----')) {
      pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`;
    }

    const sign = createSign('RSA-SHA256');
    sign.update(unsigned);
    const signature = sign.sign(pem, 'base64url');
    const jwt = `${unsigned}.${signature}`;

    // Troca JWT por access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    });
    const { access_token } = await tokenRes.json();

    if (!access_token) throw new Error('Falha ao obter token de acesso');

    // ── CHAMADAS GA4 ─────────────────────────────────
    const hoje = new Date().toISOString().split('T')[0];
    const gaHeaders = {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    };
    const gaBase = `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}`;

    const [rtRes, hojeRes, paisesRes, devRes] = await Promise.all([
      fetch(`${gaBase}:runRealtimeReport`, {
        method: 'POST', headers: gaHeaders,
        body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] })
      }),
      fetch(`${gaBase}:runReport`, {
        method: 'POST', headers: gaHeaders,
        body: JSON.stringify({
          dateRanges: [{ startDate: hoje, endDate: hoje }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'averageSessionDuration' }]
        })
      }),
      fetch(`${gaBase}:runReport`, {
        method: 'POST', headers: gaHeaders,
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 5
        })
      }),
      fetch(`${gaBase}:runReport`, {
        method: 'POST', headers: gaHeaders,
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }]
        })
      })
    ]);

    const [rt, hoje_r, paises_r, dev_r] = await Promise.all([
      rtRes.json(), hojeRes.json(), paisesRes.json(), devRes.json()
    ]);

    const ativos    = (rt.rows || []).reduce((s, r) => s + parseInt(r.metricValues[0].value), 0);
    const totalHoje = hoje_r.rows?.[0]?.metricValues?.[0]?.value || '0';
    const sessoes   = hoje_r.rows?.[0]?.metricValues?.[1]?.value || '0';
    const duracao   = hoje_r.rows?.[0]?.metricValues?.[2]?.value || '0';
    const paises    = (paises_r.rows || []).map(r => ({
      nome: r.dimensionValues[0].value,
      num: parseInt(r.metricValues[0].value)
    }));
    const devices = {};
    (dev_r.rows || []).forEach(r => {
      devices[r.dimensionValues[0].value] = parseInt(r.metricValues[0].value);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ativos, totalHoje, sessoes, duracao, paises, devices })
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};
