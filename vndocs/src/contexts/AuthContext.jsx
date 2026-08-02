import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

/** Um lote real vira um aviso no sino do Topbar. */
function avisoDeGeracao(g) {
  if (g.status === 'failed') {
    return { id: g.id, icon: '⚠️', title: 'Geração falhou',
      desc: `${g.template} · ${g.dataFile}`, time: `${g.date} ${g.time}`, unread: true };
  }
  if (g.status === 'processing') {
    return { id: g.id, icon: '⏳', title: 'Gerando documentos',
      desc: `${g.template} · em andamento`, time: `${g.date} ${g.time}`, unread: true };
  }
  return { id: g.id, icon: '✅', title: 'Lote concluído',
    desc: `${g.docs} ${g.docs === 1 ? 'documento' : 'documentos'} de ${g.template}`,
    time: `${g.date} ${g.time}`, unread: false };
}

const CONTA_VAZIA = { id: null, nome: '', email: '', empresa: '', plano: 'starter' };
const CONSUMO_VAZIO = {
  generationsUsed: 0, generationsLimit: null, documentsUsed: 0,
  planoNome: '—', restantes: null, excedeu: false,
};

/**
 * Sessão de verdade: o servidor guarda um cookie HttpOnly e o front nunca vê
 * o token. Não há nada em localStorage — a sessão não pode ser fabricada pelo
 * console do navegador, como acontecia na versão anterior.
 *
 * Este contexto também carrega a conta e o consumo, que vêm juntos em
 * /api/auth/me, e por isso é a única fonte desses dados no app.
 */
export function AuthProvider({ children }) {
  const [conta, setConta] = useState(CONTA_VAZIA);
  const [consumo, setConsumo] = useState(CONSUMO_VAZIO);
  const [avisos, setAvisos] = useState([]);
  const [autenticado, setAutenticado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregarAvisos = useCallback(async () => {
    try {
      const res = await fetch('/api/generations?limit=5');
      if (!res.ok) return;
      const lotes = await res.json();
      setAvisos(Array.isArray(lotes) ? lotes.map(avisoDeGeracao) : []);
    } catch {
      /* aviso é enfeite: falhar aqui não atrapalha o uso */
    }
  }, []);

  /** Pergunta ao servidor quem está logado. 401 significa "ninguém". */
  const recarregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/me');
      if (res.status === 401) {
        setAutenticado(false);
        setConta(CONTA_VAZIA);
        setConsumo(CONSUMO_VAZIO);
        setAvisos([]);
        return;
      }
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error || 'Não foi possível verificar a sessão.');
      setConta(corpo.conta);
      setConsumo(corpo.consumo);
      setAutenticado(true);
      carregarAvisos();
    } catch (err) {
      setError(err.message);
      setAutenticado(false);
    } finally {
      setLoading(false);
    }
  }, [carregarAvisos]);

  useEffect(() => { recarregar(); }, [recarregar]);

  async function enviar(rota, dados) {
    const res = await fetch(rota, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) throw new Error(corpo?.error || 'Não foi possível concluir.');
    return corpo;
  }

  /** Entra. Lança Error com mensagem pronta para mostrar. */
  const login = useCallback(async (email, senha) => {
    const corpo = await enviar('/api/auth/login', { email, senha });
    setConta(corpo.conta);
    setAutenticado(true);
    await recarregar();
    return corpo.conta;
  }, [recarregar]);

  /** Cria conta e já entra. */
  const register = useCallback(async ({ email, senha, nome, empresa, codigo }) => {
    const corpo = await enviar('/api/auth/register', { email, senha, nome, empresa, codigo });
    setConta(corpo.conta);
    setAutenticado(true);
    await recarregar();
    return corpo.conta;
  }, [recarregar]);

  /** Sai. Encerra a sessão no servidor, não só no navegador. */
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAutenticado(false);
      setConta(CONTA_VAZIA);
      setConsumo(CONSUMO_VAZIO);
      setAvisos([]);
    }
  }, []);

  /** Salva alterações da conta. Devolve { ok, error }. */
  const salvar = useCallback(async (alteracoes) => {
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(alteracoes),
      });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error || 'Não foi possível salvar.');
      setConta(corpo.conta);
      setConsumo(corpo.consumo);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, []);

  const primeiroNome = (conta.nome || '').split(' ')[0] || '';
  const iniciais = (conta.nome || conta.email || '')
    .split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '—';

  return (
    <AuthContext.Provider value={{
      conta, consumo, avisos,
      user: autenticado ? conta : null,
      isAuthenticated: autenticado,
      loading, error,
      primeiroNome, iniciais,
      login, register, logout, salvar, recarregar,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}

/**
 * Mesmo contexto, nome que as telas de conta já usavam. Evita que Sidebar,
 * Topbar, Dashboard, Plano e Configurações precisem mudar de import.
 */
export const useAccount = useAuth;
