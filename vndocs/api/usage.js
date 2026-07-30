import { comConta, json } from './_lib.js';
import { consumoAtual } from '../lib/repo.js';

/** GET /api/usage — consumo do ciclo e limite do plano. */
export const GET = comConta(async (_req, user) => json({
  ...(await consumoAtual(user)),
  conta: { nome: user.name, email: user.email, empresa: user.company, plano: user.plan },
}));
