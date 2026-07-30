/**
 * Renderiza o app num DOM falso (jsdom) e confere que cada rota produz
 * conteúdo real. É esse teste que pega "tela branca" — coisa que o
 * `vite build` não pega, porque build não renderiza nada.
 *
 * A sessão agora vem de GET /api/auth/me, não de localStorage. O estado de
 * login é controlado aqui pela variável `logado`, e o fetch falso responde
 * 401 ou 200 conforme ela.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.localStorage = dom.window.localStorage;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* ── fetch falso, no formato exato das rotas ──────────────────────────── */
let logado = false;
let chamadas = [];

const CONTA = {
  id: 'u1', nome: 'Gustavo Santana', email: 'gustavo@empresa.com',
  empresa: 'Gustavo Vita Consultoria', plano: 'pro',
};
const CONSUMO = {
  periodo: '2026-07', plano: 'pro', planoNome: 'Pro',
  generationsUsed: 3, generationsLimit: 500, documentsUsed: 128,
  restantes: 497, excedeu: false,
};
const GERACOES = [
  { id: 'g1', template: 'Contrato_Prestacao.docx', dataFile: 'clientes_julho.xlsx', docs: 41, size: '2.4 MB', status: 'completed', date: '29/07/2026', time: '14:02', seconds: 1.6 },
  { id: 'g2', template: 'Recibo_Simples.docx', dataFile: 'pagamentos_07.xlsx', docs: 87, size: '5.1 MB', status: 'completed', date: '28/07/2026', time: '09:31', seconds: 2.4 },
  { id: 'g3', template: 'Procuracao_v2.docx', dataFile: 'processos.xlsx', docs: 0, size: '—', status: 'failed', date: '27/07/2026', time: '17:48', seconds: 0 },
];
const PASTAS = [{
  id: 'f1', name: 'Contratos de prestação', desc: 'Modelos padrão de serviço',
  pinned: true, uses: 5,
  template: { file: 'Contrato_Prestacao.docx', vars: 7, uses: 5, updated: 'agora' },
  sheets: [{ name: 'clientes_julho.xlsx', rows: 5, updated: 'agora' }],
}];
const PAINEL = {
  documentosGerados: 128, lotes: 3, templatesAtivos: 2, planilhas: 2,
  linhasTotais: 46, documentosEsteMes: 128, variacaoPercentual: 12,
  consumo: CONSUMO,
};

const resposta = (corpo, status = 200) => new Response(JSON.stringify(corpo), {
  status, headers: { 'content-type': 'application/json' },
});

globalThis.fetch = async (url, opts = {}) => {
  const rota = String(url).split('?')[0];
  const metodo = (opts.method || 'GET').toUpperCase();
  chamadas.push(`${metodo} ${rota}`);

  if (rota === '/api/auth/me') {
    return logado
      ? resposta({ conta: CONTA, consumo: CONSUMO })
      : resposta({ error: 'Não autenticado.' }, 401);
  }
  if (rota === '/api/auth/login' || rota === '/api/auth/register') {
    const corpo = opts.body ? JSON.parse(opts.body) : {};
    if (!corpo.senha || corpo.senha.length < 8) {
      return resposta({ error: 'A senha precisa de pelo menos 8 caracteres.' }, 400);
    }
    logado = true;
    return resposta({ conta: { ...CONTA, email: corpo.email || CONTA.email } },
      rota.endsWith('register') ? 201 : 200);
  }
  if (rota === '/api/auth/logout') {
    logado = false;
    return resposta({ ok: true });
  }

  /* Rotas de dados exigem sessão, como no servidor. */
  if (!logado) return resposta({ error: 'Não autenticado.' }, 401);
  if (rota === '/api/generations') return resposta(GERACOES);
  if (rota === '/api/folders') return resposta(PASTAS);
  if (rota === '/api/dashboard') return resposta(PAINEL);
  if (rota === '/api/account') return resposta({ conta: CONTA, consumo: CONSUMO });

  return resposta({ error: 'rota não esperada no teste: ' + rota }, 404);
};

const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { act } = await import('react');
const { MemoryRouter } = await import('react-router-dom');

const App = (await import('./src/App.jsx')).default;
const { AuthProvider } = await import('./src/contexts/AuthContext.jsx');
const { ToastProvider } = await import('./src/contexts/ToastContext.jsx');
const Toast = (await import('./src/components/ui/Toast.jsx')).default;

const erros = [];
const origError = console.error;
console.error = (...a) => { erros.push(a.join(' ')); };

let fails = 0;
const check = (label, cond, detalhe = '') => {
  origError(`${cond ? '  ok  ' : ' FALHA'} ${label}${!cond && detalhe ? '  — ' + detalhe : ''}`);
  if (!cond) fails++;
};

function arvore(rota) {
  return React.createElement(MemoryRouter, { initialEntries: [rota] },
    React.createElement(ToastProvider, null,
      React.createElement(AuthProvider, null,
        React.createElement(App, null),
        React.createElement(Toast, null),
      ),
    ),
  );
}

/** Monta, espera a sessão e os dados chegarem, devolve o HTML. */
async function render(rota) {
  const host = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(arvore(rota)); });
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  const html = host.innerHTML;
  await act(async () => root.unmount());
  host.remove();
  return html;
}

/* ── Rotas públicas, sem sessão ───────────────────────────────────────── */
logado = false;
for (const r of ['/login', '/register']) {
  chamadas = [];
  const html = await render(r);
  check(`${r} renderiza sem sessão`, html.length > 200, `${html.length} chars`);
}

/* Rota protegida sem sessão tem de cair no login, não em tela branca. */
chamadas = [];
const semSessao = await render('/');
check('rota protegida sem sessão manda para o login',
  semSessao.includes('input') && semSessao.length > 200, `${semSessao.length} chars`);
check('não mostra dado de conta nenhuma sem sessão', !semSessao.includes('Gustavo Santana'));

/* ── Rotas protegidas, com sessão ─────────────────────────────────────── */
logado = true;
const protegidas = ['/', '/generate', '/biblioteca', '/history', '/pricing', '/settings'];
for (const r of protegidas) {
  chamadas = [];
  const html = await render(r);
  check(`${r} renderiza com sessão`, html.length > 200, `${html.length} chars`);
  check(`  ${r} consulta a sessão`, chamadas.includes('GET /api/auth/me'), chamadas.join(', '));

  if (r === '/biblioteca') {
    check('  biblioteca busca as pastas', chamadas.includes('GET /api/folders'), chamadas.join(', '));
    check('  biblioteca mostra a pasta da API',
      html.includes('Contratos de presta') && html.includes('Contrato_Prestacao.docx'));
    check('  biblioteca mostra as 7 variáveis', html.includes('7 vari'));
  }
  if (r === '/history') {
    check('  histórico busca os lotes', chamadas.includes('GET /api/generations'), chamadas.join(', '));
    check('  histórico lista os arquivos reais',
      html.includes('clientes_julho.xlsx') && html.includes('pagamentos_07.xlsx'));
    check('  histórico soma 128 documentos', html.includes('128'));
    check('  histórico usa a duração real (2.0s)', html.includes('2.0s'));
    check('  histórico marca a falha', html.includes('Erro'));
  }
  if (r === '/') {
    check('  dashboard busca os números', chamadas.includes('GET /api/dashboard'), chamadas.join(', '));
    check('  dashboard mostra 128 documentos', html.includes('128'));
    check('  dashboard sumiu com o 2.847 fixo', !html.includes('2.847'));
    check('  dashboard saúda pelo nome da conta', html.includes('Gustavo'));
  }
  if (r === '/settings') {
    check('  configurações trazem a conta real',
      html.includes('Gustavo Vita Consultoria') && html.includes('gustavo@empresa.com'));
    check('  configurações não mostram o João Silva falso', !html.includes('João Silva'));
  }
  check(`  ${r} tem botão de sair`, html.includes('Sair'));
}

/* ── Quem já tem sessão não vê a tela de login ────────────────────────── */
logado = true;
const loginComSessao = await render('/login');
check('com sessão, /login redireciona para o app',
  !loginComSessao.querySelector && !loginComSessao.includes('Entrar na conta'),
  'ainda mostra o formulário de login');

/* ── Nada de sessão fabricada pelo navegador ──────────────────────────── */
logado = false;
localStorage.setItem('gt_session', JSON.stringify({ id: 'x', name: 'Invasor' }));
const comLocalStorage = await render('/');
check('localStorage não cria sessão (a antiga brecha)',
  !comLocalStorage.includes('Invasor') && !comLocalStorage.includes('Gustavo Santana'));
localStorage.clear();

/* ── Fluxo de login pela tela ─────────────────────────────────────────── */
function digitar(el, valor) {
  const setter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype, 'value',
  ).set;
  setter.call(el, valor);
  el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
}

logado = false;
chamadas = [];
const host = dom.window.document.createElement('div');
dom.window.document.body.appendChild(host);
const root = createRoot(host);
await act(async () => { root.render(arvore('/login')); });
await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

const campoEmail = host.querySelector('input[type="email"]');
const campoSenha = host.querySelector('input[type="password"]');
const botao = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('Entrar na conta'));
check('login tem campo de e-mail', !!campoEmail);
check('login tem campo de senha', !!campoSenha);
check('login tem botão Entrar', !!botao);

if (campoEmail && campoSenha && botao) {
  /* Senha curta: a API recusa e a pessoa continua no formulário. */
  await act(async () => { digitar(campoEmail, 'gustavo@empresa.com'); digitar(campoSenha, '123'); });
  await act(async () => { botao.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
  await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
  check('senha curta não entra', !!host.querySelector('input[type="email"]'));
  check('senha curta chamou o servidor', chamadas.includes('POST /api/auth/login'));

  /* Senha válida: entra. */
  chamadas = [];
  await act(async () => { digitar(host.querySelector('input[type="password"]'), 'senhaboa123'); });
  const botao2 = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('Entrar na conta'));
  await act(async () => { botao2.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
  await act(async () => { await new Promise((r) => setTimeout(r, 80)); });

  check('login envia POST /api/auth/login', chamadas.includes('POST /api/auth/login'), chamadas.join(', '));
  check('saiu da tela de login', !host.querySelector('input[type="email"]'));
  check('chegou no app', host.innerHTML.length > 15000, `${host.innerHTML.length} chars`);
  check('a sessão não foi para o localStorage', !localStorage.getItem('gt_session'));
}

await act(async () => root.unmount());
host.remove();

const graves = erros.filter((e) =>
  /must be used within|precisa estar dentro|Cannot read|is not a function|is not defined|undefined is not|Functions are not valid as a React child/.test(e)
);
check('nenhum erro grave no console', graves.length === 0, graves[0]?.slice(0, 200) || '');

console.error = origError;
console.log(fails === 0 ? '\nRenderização ok.' : `\n${fails} falha(s).`);
process.exit(fails === 0 ? 0 : 1);
