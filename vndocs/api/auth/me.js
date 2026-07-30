import { json } from '../_lib.js';
import { lerCookie, usuarioDaSessao, contaPublica } from '../../lib/auth.js';
import { consumoAtual } from '../../lib/repo.js';

/**
 * GET /api/auth/me — quem está logado.
 * 401 quando não há sessão: é assim que o front sabe que precisa pedir login.
 */
export async function GET(request) {
  try {
    const user = await usuarioDaSessao(lerCookie(request));
    if (!user) return json({ error: 'Não autenticado.' }, 401);
    return json({ conta: contaPublica(user), consumo: await consumoAtual(user) });
  } catch (err) {
    console.error('me falhou:', err);
    return json({ error: 'Não foi possível verificar a sessão.' }, 503);
  }
}
