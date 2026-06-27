const { createSign } = require('crypto');

const GA_PROPERTY_ID = '399155331';
const SA_EMAIL = 'portau-analytics@portau-analytics.iam.gserviceaccount.com';

// Chave privada completa
const SA_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDOWfXkyXeJdYTX
bWcSgVb7rYdSF736qlDSV6HodlpZdYSiKRqqFDSdi+1Xg2QhUpW3AhLV6CKPxeyG
YhrJVDCDJBi09jsD8LOefxA0zkZQB5wbeKrj2v1618d0V6DJ1duQBzKoq6oOYlnH
TyfS41ySRU8VQ96BffC012GCkQ8NLb/sEKc68TtAcK9xHY0BzTW0KCvvKySuPfZI
P6e/mi8B0S+Eue1Owar0uNRjbqnozmm3EfkkH3tdGlFGtcPa9nX+qPg420XP0vFC
R3GLfChhkuiKuMKJB/IqBgPZQCHQwVCVmbzJnhKrnMEz2vpCKdd8HpJ0u83WX9w2
HzhTtLINAgMBAAECggEACIITY5UI+DfKZpAst/RxmoaboJS5BmeqVcSQ45hUU6xG
7+Fjp4/rYXQ+W3rf5d3VWB/eQ0ft0OFsxgJahLg+GHzPBfsXENZbrup3R8NviRI0
lg9iIGtMQ0SNWpctr9TBAk3BrCGz18xR/lKdsOd4pCahGEky7ezm6qtCFSjs/B02
nmxjD8a5tUf81lD/APuPuXiNmt9tH93bakWUCHNXQ2zQNNw2PtPzP/Rovp07o6Wc
Dh0ubfxmp1aX6zmGuKyXjtFOcvR++OOv4Eo0Tj6hR7oZtKyIhJMmKpezK1EMhw9e
4wWfXNjMcqhAlJgEJ90wM4sBslnGcHsK9O7bFGwmowKBgQD3QERxodcWHTGhWnL6
/i5/lr+UG7YPCM0P8YrRSxKs3U9hquMzoMWCnoWdBCDXqjisBotFonoxwnHUFXJ3
574TfUUdE9QFTFyuqBmWE1vlWfX/CzFgfKJ5nD2Eu7EHU/3z/scm/h6ojk/IdKXl
Hiaqf7Mb6ksiTLkeqCjKkBuHXwKBgQDVpzPKt5zGilXMAtGKc+025LZyBDaaxhyi
biuwsvVWdWgeD/1eZSDMXsJEzqPV+3RnxZlUOxDFb8f/NQKgdDF2cNLZTdWZmDnr
AK3LAVx7VXvWvtbNpUn5S/fbX6p/a9SP0kk9mJN8q/FKFDXhSFPzPJHfahLd8jKA
e108JFYaEwKBgQDhzaO0UyVnYMoOndgcOT6l7zqPPK+ME3GTefhZI8KudH8mpzZP
1CgNHlDQEREdZKvVDzTqJ3SJNRdXpS6hKteAXQtdftpG7HJIX+TeFlf6oanzfnld
sPWBMptMOU13b9Ghn7Cpf7LoJO/gFgfbsymE1JLyj4qGjKMTyGdYdzts6QKBgBzy
JTsuuyfO8CbOrvLyF85bGDjER12av6BmCrdK16BaEbwY8HvMebAWmn1V/a5s/e1d
QRO/WNtW9KKn3O4+L8FbMcXNHMZNcHNdSS56xbvT7g4/Fr0PysDiwPbQtDnFMyw1
EkUtGbZHWU5vBIm8EdufdiftqBa3zI3JqO0QAzZPAoGBANJnfOiHOlxDpdN7cI98
c0De/9Tqoh4Llvco9rp8b0TPPR0H+ui5VCd17cH8+GckH73/LubArPfrbq97qeFW
Qmmq6oU85kHL4W5CKbUDqXM2WgvvGt3mbvfuC/PVxYUSz4XWmTPB+QbSPR3Ks1nE
vngpkxHuhoUYqDh9XnvBmQU8
-----END PRIVATE KEY-----`;

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
    // JWT manual com crypto nativo
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

    // Troca JWT por access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    });
    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;
    if (!access_token) throw new Error('Token inválido: ' + JSON.stringify(tokenData));

    // Chamadas GA4
    const hoje = new Date().toISOString().split('T')[0];
    const gaH = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };
    const base = `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}`;

    const [rtRes, hojeRes, paisesRes, devRes] = await Promise.all([
      fetch(`${base}:runRealtimeReport`, {
        method: 'POST', headers: gaH,
        body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] })
      }),
      fetch(`${base}:runReport`, {
        method: 'POST', headers: gaH,
        body: JSON.stringify({
          dateRanges: [{ startDate: hoje, endDate: hoje }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'averageSessionDuration' }]
        })
      }),
      fetch(`${base}:runReport`, {
        method: 'POST', headers: gaH,
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 5
        })
      }),
      fetch(`${base}:runReport`, {
        method: 'POST', headers: gaH,
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
