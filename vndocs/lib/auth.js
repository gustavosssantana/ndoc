/**
 * Autenticação do ndocs.
 *
 * Senha: scrypt do módulo node:crypto — sem dependência nova, e é uma função
 * de derivação lenta e com sal, do jeito que senha precisa ser guardada.
 * Nunca guardamos a senha, só o resultado.
 *
 * Sessão: token aleatório de 32 bytes entregue num cookie HttpOnly. No banco
 * fica apenas o SHA-256 desse token, então um vazamento do banco não dá acesso
 * a ninguém. A sessão viver no banco permite revogar — sair de um aparelho ou
 * trocar a senha derruba o acesso imediatamente.
 */
import { randomBytes, scrypt as _scrypt, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { one, query } from './db.js';

const scrypt = promisify(_scrypt);

export const COOKIE = 'ndocs_session';
const DIAS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/* ── Senha ───────────────────────────────────────────────────────────── */

/** Regras mínimas. Devolve a queixa, ou null se estiver ok. */
export function criticarSenha(senha) {
  const s = String(senha ?? '');
  if (s.length < 8) return 'A senha precisa de pelo menos 8 caracteres.';
  if (s.length > 200) return 'A senha é longa demais.';
  if (!/[a-zA-Z]/.test(s)) return 'A senha precisa de pelo menos uma letra.';
  if (!/[0-9]/.test(s)) return 'A senha precisa de pelo menos um número.';
  return null;
}

export async function gerarHash(senha) {
  const sal = randomBytes(16).toString('hex');
  const chave = await scrypt(String(senha), sal, SCRYPT.keylen, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p,
  });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${sal}$${chave.toString('hex')}`;
}

/** Comparação em tempo constante, para não vazar informação pelo tempo. */
export async function conferirSenha(senha, hashGuardado) {
  if (!hashGuardado || typeof hashGuardado !== 'string') return false;
  const partes = hashGuardado.split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;

  const [, N, r, p, sal, esperado] = partes;
  let chave;
  try {
    chave = await scrypt(String(senha), sal, esperado.length / 2, {
      N: Number(N), r: Number(r), p: Number(p),
    });
  } catch {
    return false;
  }
  const a = Buffer.from(esperado, 'hex');
  return a.length === chave.length && timingSafeEqual(a, chave);
}

/* ── Sessão ──────────────────────────────────────────────────────────── */

const hashDoToken = (token) => createHash('sha256').update(token).digest('hex');

/** Cria a sessão e devolve o token em claro (só aqui ele existe). */
export async function criarSessao(userId, userAgent = '') {
  const token = randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + DIAS * 24 * 60 * 60 * 1000);
  await one(
    `INSERT INTO sessions (user_id, token_hash, user_agent, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, hashDoToken(token), String(userAgent).slice(0, 300), expira],
  );
  return { token, expira };
}

/** Devolve o usuário da sessão, ou null. Renova o last_seen_at. */
export async function usuarioDaSessao(token) {
  if (!token) return null;
  const linha = await one(
    `SELECT u.*, s.id AS session_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashDoToken(token)],
  );
  if (!linha) return null;
  /* Best-effort: falhar em atualizar o last_seen não deve derrubar a request. */
  query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [linha.session_id])
    .catch(() => {});
  return linha;
}

export async function encerrarSessao(token) {
  if (!token) return false;
  const r = await one(
    'DELETE FROM sessions WHERE token_hash = $1 RETURNING id',
    [hashDoToken(token)],
  );
  return Boolean(r);
}

/** Derruba todas as sessões de um usuário (troca de senha, "sair de tudo"). */
export async function encerrarTodasAsSessoes(userId) {
  const r = await query('DELETE FROM sessions WHERE user_id = $1 RETURNING id', [userId]);
  return r.length;
}

/** Remove sessões vencidas. Chamado no login, sem custo perceptível. */
export function limparSessoesVencidas() {
  return query('DELETE FROM sessions WHERE expires_at < now()').catch(() => []);
}

/* ── Cookie ──────────────────────────────────────────────────────────── */

export function lerCookie(request, nome = COOKIE) {
  const cru = request.headers.get('cookie');
  if (!cru) return null;
  for (const parte of cru.split(';')) {
    const [k, ...resto] = parte.trim().split('=');
    if (k === nome) return decodeURIComponent(resto.join('='));
  }
  return null;
}

function producao() {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

export function cookieDeSessao(token, expira) {
  const partes = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',                 // JavaScript da página não lê — barra roubo por XSS
    'SameSite=Lax',             // não vai em requisição de outro site
    `Expires=${expira.toUTCString()}`,
  ];
  if (producao()) partes.push('Secure');
  return partes.join('; ');
}

export function cookieLimpo() {
  const partes = [
    `${COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  if (producao()) partes.push('Secure');
  return partes.join('; ');
}

/** Formato público da conta — nunca inclui password_hash. */
export function contaPublica(u) {
  return {
    id: u.id, nome: u.name, email: u.email, empresa: u.company, plano: u.plan,
    avatar: u.avatar_url ? '/api/avatar' : '',
    temAvatar: Boolean(u.avatar_url),
  };
}
