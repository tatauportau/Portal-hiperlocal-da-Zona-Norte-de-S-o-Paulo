exports.handler = async () => {
  const response = await fetch(
    'https://api.github.com/repos/tatauportau/Portal-hiperlocal-da-Zona-Norte-de-S-o-Paulo/actions/workflows/portau-diario.yml/dispatches',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_PAT}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'principal' }),
    }
  );
  console.log('[Portau] Dispatch status:', response.status);
  return { statusCode: 200 };
};
