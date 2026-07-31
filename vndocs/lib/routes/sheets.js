import { comConta, json, readSingleFile } from './_lib.js';
import { listarPlanilhas, salvarPlanilha, apagarPlanilha } from '../repo.js';

/** GET /api/sheets — planilhas salvas. */
export const GET = comConta(async (_req, user) => json(await listarPlanilhas(user.id)));

/** POST /api/sheets — multipart com o campo "data" (.xlsx). */
export const POST = comConta(async (request, user) => {
  let arquivo;
  try {
    arquivo = await readSingleFile(request, 'data');
  } catch (err) {
    return json({ error: err.message }, 400);
  }
  return json(await salvarPlanilha(user.id, arquivo), 201);
});

/** DELETE /api/sheets?id=... */
export const DELETE = comConta(async (request, user) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Informe o id.' }, 400);
  const ok = await apagarPlanilha(user.id, id);
  return ok ? json({ apagado: true }) : json({ error: 'Planilha não encontrada.' }, 404);
});
