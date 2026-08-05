import { comConta, json, readSingleFile } from './_lib.js';
import { listarTemplates, salvarTemplate, apagarTemplate } from '../repo.js';

/** GET /api/templates — templates salvos. */
export const GET = comConta(async (_req, user) => json(await listarTemplates(user)));

/** POST /api/templates — multipart com o campo "template" (.docx). */
export const POST = comConta(async (request, user) => {
  let arquivo;
  try {
    arquivo = await readSingleFile(request, 'template');
  } catch (err) {
    return json({ error: err.message }, 400);
  }
  const salvo = await salvarTemplate(user, arquivo);
  if (!salvo.variables.length) {
    return json({
      ...salvo,
      aviso: 'Nenhum campo {{...}} foi encontrado neste .docx.',
    }, 201);
  }
  return json(salvo, 201);
});

/** DELETE /api/templates?id=... */
export const DELETE = comConta(async (request, user) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Informe o id.' }, 400);
  const ok = await apagarTemplate(user, id);
  return ok ? json({ apagado: true }) : json({ error: 'Template não encontrado.' }, 404);
});
