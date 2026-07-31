import { comConta, json, readSingleFile } from './_lib.js';
import { listarPastas, criarPasta, renomearPasta, apagarPasta } from '../repo.js';

/** GET /api/folders — pastas com template e planilhas de cada uma. */
export const GET = comConta(async (_req, user) => json(await listarPastas(user.id)));

/** POST /api/folders — cria pasta. Corpo JSON: { nome, descricao?, pinned? } */
export const POST = comConta(async (request, user) => {
  const corpo = await request.json().catch(() => ({}));
  if (!corpo.nome?.trim()) return json({ error: 'Informe o nome da pasta.' }, 400);
  return json(await criarPasta(user.id, corpo), 201);
});

/** PATCH /api/folders?id=... — corpo JSON: { nome?, descricao? } */
export const PATCH = comConta(async (request, user) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Informe o id da pasta.' }, 400);
  const corpo = await request.json().catch(() => ({}));
  try {
    const f = await renomearPasta(user.id, id, corpo);
    return f ? json(f) : json({ error: 'Pasta não encontrada.' }, 404);
  } catch (err) {
    return json({ error: err.message }, 400);
  }
});

/** DELETE /api/folders?id=... — os arquivos dentro dela não são apagados. */
export const DELETE = comConta(async (request, user) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Informe o id da pasta.' }, 400);
  const ok = await apagarPasta(user.id, id);
  return ok ? json({ apagado: true }) : json({ error: 'Pasta não encontrada.' }, 404);
});
