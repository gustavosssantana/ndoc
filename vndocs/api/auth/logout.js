import { lerCookie, encerrarSessao, cookieLimpo } from '../../lib/auth.js';

/** POST /api/auth/logout — encerra a sessão atual. */
export async function POST(request) {
  try {
    await encerrarSessao(lerCookie(request));
  } catch (err) {
    console.warn('logout: nao foi possivel apagar a sessao:', err.message);
  }
  /* Limpa o cookie de qualquer jeito: do lado do usuário, saiu. */
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'set-cookie': cookieLimpo() },
  });
}
