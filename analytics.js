const { GoogleAuth } = require('google-auth-library');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

const GA_PROPERTY_ID = '399155331';

const credentials = {
  type: "service_account",
  project_id: "portau-analytics",
  private_key_id: "fd746c9849c5b4bf3329350b5a252fdb6c62d80a",
  private_key: process.env.GA_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: "portau-analytics@portau-analytics.iam.gserviceaccount.com",
  client_id: "109134833488205166854",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
};

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
    const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });
    const hoje = new Date().toISOString().split('T')[0];

    const [rtResp, hojeResp, paisesResp, devicesResp] = await Promise.all([
      analyticsDataClient.runRealtimeReport({
        property: `properties/${GA_PROPERTY_ID}`,
        metrics: [{ name: 'activeUsers' }],
      }),
      analyticsDataClient.runReport({
        property: `properties/${GA_PROPERTY_ID}`,
        dateRanges: [{ startDate: hoje, endDate: hoje }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'averageSessionDuration' }
        ],
      }),
      analyticsDataClient.runReport({
        property: `properties/${GA_PROPERTY_ID}`,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5,
      }),
      analyticsDataClient.runReport({
        property: `properties/${GA_PROPERTY_ID}`,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
      }),
    ]);

    const ativos = (rtResp[0].rows || []).reduce((s, r) => s + parseInt(r.metricValues[0].value), 0);
    const totalHoje = hojeResp[0].rows?.[0]?.metricValues?.[0]?.value || '0';
    const sessoes = hojeResp[0].rows?.[0]?.metricValues?.[1]?.value || '0';
    const duracao = hojeResp[0].rows?.[0]?.metricValues?.[2]?.value || '0';

    const paises = (paisesResp[0].rows || []).map(r => ({
      nome: r.dimensionValues[0].value,
      num: parseInt(r.metricValues[0].value)
    }));

    const devices = {};
    (devicesResp[0].rows || []).forEach(r => {
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
