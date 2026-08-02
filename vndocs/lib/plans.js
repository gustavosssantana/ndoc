/**
 * Limites dos planos. Os números batem com o que a tela de Plano e cobrança
 * anuncia — se mudar aqui, mude lá também (src/pages/Pricing.jsx).
 */
export const PLANOS = {
  starter:    { nome: 'Starter',    geracoesPorMes: 20,   templates: 3,        usuarios: 1 },
  pro:        { nome: 'Pro',        geracoesPorMes: 500,  templates: Infinity, usuarios: 3 },
  business:   { nome: 'Business',   geracoesPorMes: 5000, templates: Infinity, usuarios: 10 },
  enterprise: { nome: 'Enterprise', geracoesPorMes: Infinity, templates: Infinity, usuarios: Infinity },
};

export function limiteDo(plano) {
  return PLANOS[plano] ?? PLANOS.starter;
}

/** Ciclo atual no formato 'YYYY-MM'. */
export function periodoAtual(data = new Date()) {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
}
