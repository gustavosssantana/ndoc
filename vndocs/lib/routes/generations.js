import { comConta, json } from './_lib.js';
import { listarGeracoes } from '../repo.js';

/** GET /api/generations?limit=100 — histórico de lotes. */
export const GET = comConta(async (request, user) => {
  const limite = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 100, 500);
  return json(await listarGeracoes(user.id, limite));
});
