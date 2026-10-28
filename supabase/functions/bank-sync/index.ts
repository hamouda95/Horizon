const appOrigin = 'https://horizon-foyer.onrender.com';
const allowedOrigins = new Set([appOrigin, 'http://localhost:5173']);

function response(request: Request, payload: Record<string, string>, status: number) {
  const origin = request.headers.get('Origin');
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : appOrigin,
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '600',
      'Content-Type': 'application/json',
      'Vary': 'Origin',
    },
  });
}

Deno.serve((request: Request) => {
  if (request.method === 'OPTIONS') return response(request, {}, 200);
  if (request.method !== 'POST') return response(request, { error: 'Méthode non autorisée.' }, 405);
  return response(request, {
    error: 'La synchronisation bancaire automatique est reportée. Importez vos relevés manuellement.',
  }, 503);
});
