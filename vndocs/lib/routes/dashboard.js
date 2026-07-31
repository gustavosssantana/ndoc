import { comConta, json } from './_lib.js';
import { painel } from '../repo.js';

/** GET /api/dashboard — números reais do painel. */
export const GET = comConta(async (_req, user) => json(await painel(user)));
