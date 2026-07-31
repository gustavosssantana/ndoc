/**
 * Porta de entrada única da API.
 *
 * O plano Hobby da Vercel permite no máximo 12 funções por deploy, e o
 * projeto tem 14 rotas. Em vez de cortar funcionalidade, todas as rotas
 * passam por esta função, que despacha para o handler certo em lib/routes/.
 *
 * Vantagem extra: uma função só significa menos partidas a frio.
 *
 * Os handlers continuam separados, um arquivo por rota, e continuam sendo
 * testados individualmente — só a porta de entrada foi unificada.
 */

/* Cada rota aponta para o módulo que a implementa. O import é dinâmico para
   que uma requisição de login não precise carregar o motor de documentos. */
const ROTAS = {
  'health':        () => import('../lib/routes/health.js'),
  'inspect':       () => import('../lib/routes/inspect.js'),
  'generate':      () => import('../lib/routes/generate.js'),
  'folders':       () => import('../lib/routes/folders.js'),
  'templates':     () => import('../lib/routes/templates.js'),
  'sheets':        () => import('../lib/routes/sheets.js'),
  'generations':   () => import('../lib/routes/generations.js'),
  'dashboard':     () => import('../lib/routes/dashboard.js'),
  'usage':         () => import('../lib/routes/usage.js'),
  'account':       () => import('../lib/routes/account.js'),
  'auth-register': () => import('../lib/routes/auth-register.js'),
  'auth-login':    () => import('../lib/routes/auth-login.js'),
  'auth-logout':   () => import('../lib/routes/auth-logout.js'),
  'auth-me':       () => import('../lib/routes/auth-me.js'),
  'auth/register': () => import('../lib/routes/auth-register.js'),
  'auth/login':    () => import('../lib/routes/auth-login.js'),
  'auth/logout':   () => import('../lib/routes/auth-logout.js'),
  'auth/me':       () => import('../lib/routes/auth-me.js'),
};

const json = (corpo, status) => Response.json(corpo, { status });

/** Tira /api do começo e as barras das pontas: /api/auth/login -> auth/login */
function nomeDaRota(url) {
  let caminho = new URL(url).pathname;
  if (caminho.startsWith('/api')) caminho = caminho.slice(4);
  return caminho.replace(/^\/+|\/+$/g, '');
}

async function despachar(request) {
  const rota = nomeDaRota(request.url);
  const carregar = ROTAS[rota];

  if (!carregar) {
    return json({ error: `Rota não encontrada: /api/${rota}` }, 404);
  }

  let modulo;
  try {
    modulo = await carregar();
  } catch (err) {
    console.error(`falha ao carregar a rota ${rota}:`, err);
    return json({ error: 'Erro interno ao carregar a rota.' }, 500);
  }

  const metodo = request.method.toUpperCase();
  const handler = modulo[metodo];

  if (!handler) {
    const permitidos = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
      .filter((m) => modulo[m]);
    return new Response(
      JSON.stringify({ error: `${metodo} não é aceito em /api/${rota}.` }),
      {
        status: 405,
        headers: { 'content-type': 'application/json', allow: permitidos.join(', ') },
      },
    );
  }

  return handler(request);
}

export const GET = despachar;
export const POST = despachar;
export const PATCH = despachar;
export const PUT = despachar;
export const DELETE = despachar;
export const HEAD = despachar;
