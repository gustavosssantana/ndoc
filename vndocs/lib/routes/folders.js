import { comConta, json, readSingleFile } from './_lib.js';
import { listarPastas, criarPasta } from '../repo.js';

/** GET /api/folders — pastas com template e planilhas de cada uma. */
export const GET = comConta(async (_req, user) => json(await listarPastas(user.id)));

/** POST /api/folders — cria pasta. Corpo JSON: { nome, descricao?, pinned? } */
export const POST = comConta(async (request, user) => {
  const corpo = await request.json().catch(() => ({}));
  if (!corpo.nome?.trim()) return json({ error: 'Informe o nome da pasta.' }, 400);
  return json(await criarPasta(user.id, corpo), 201);
});
