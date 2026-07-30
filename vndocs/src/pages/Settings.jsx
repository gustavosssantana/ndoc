import { useState, useEffect } from 'react';
import { User, Shield, Mail, Edit2, Check } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Topbar from '../components/layout/Topbar';
import { useAccount } from '../contexts/AccountContext';

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#2563EB' : 'rgba(15,23,42,.12)', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: value ? 20 : 3, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
    </div>
  );
}

const TABS = [
  { key: 'perfil',        icon: User,   label: 'Perfil'         },
  { key: 'seguranca',     icon: Shield, label: 'Segurança'      },
  { key: 'notificacoes',  icon: Mail,   label: 'Notificações'   },
];

function Avatar({ name, size = 64 }) {
  const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#2563EB,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * .38, fontWeight: 600, color: '#fff', flexShrink: 0, letterSpacing: '-0.02em' }}>{ini}</div>
  );
}

function TabPerfil() {
  const { conta, salvar } = useAccount();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  /* A conta chega depois do primeiro render, então os campos acompanham. */
  useEffect(() => {
    setName(conta.nome || '');
    setEmail(conta.email || '');
    setCompany(conta.empresa || '');
  }, [conta.nome, conta.email, conta.empresa]);

  /* Grava de verdade, via PATCH /api/account. */
  const handleSave = async () => {
    setSalvando(true);
    setErro(null);
    const r = await salvar({ nome: name, empresa: company });
    setSalvando(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setErro(r.error);
    }
  };
  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 4 }}>Perfil</h3>
        <p style={{ fontSize: 13.5, color: 'rgba(15,23,42,.45)' }}>Informações da sua conta e empresa.</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: '#ffffff', border: '1px solid rgba(15,23,42,.07)', borderRadius: 14 }}>
        <Avatar name={name} size={64} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>{name}</div>
          <div style={{ fontSize: 13, color: 'rgba(15,23,42,.45)' }}>{email}</div>
        </div>
        <button style={{ height: 30, padding: '0 12px', borderRadius: 999, background: '#ffffff', border: '1px solid rgba(15,23,42,.07)', color: 'rgba(15,23,42,.62)', fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Edit2 size={13} /> Alterar foto
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[['Nome completo', name, setName], ['E-mail', email, setEmail]].map(([l, v, s]) => (
            <div key={l}>
              <label style={{ fontSize: 12, color: 'rgba(15,23,42,.55)', fontWeight: 500, display: 'block', marginBottom: 6 }}>{l}</label>
              <input value={v} onChange={e => s(e.target.value)} style={{ width: '100%', height: 42, padding: '0 14px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15,23,42,.1)', color: '#0f172a', fontSize: 14, outline: 'none' }} />
            </div>
          ))}
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'rgba(15,23,42,.55)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Empresa</label>
          <input value={company} onChange={e => setCompany(e.target.value)} style={{ width: '100%', height: 42, padding: '0 14px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15,23,42,.1)', color: '#0f172a', fontSize: 14, outline: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'rgba(15,23,42,.55)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Fuso horário</label>
          <select style={{ width: '100%', height: 42, padding: '0 14px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15,23,42,.1)', color: '#0f172a', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
            <option>America/Sao_Paulo (UTC-3)</option>
            <option>America/New_York (UTC-5)</option>
            <option>Europe/Lisbon (UTC+0/+1)</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleSave} disabled={salvando} style={{ height: 38, padding: '0 16px', borderRadius: 999, background: salvando ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          {salvando ? 'Salvando…' : saved ? <><Check size={15} /> Salvo!</> : 'Salvar alterações'}
        </button>
        {erro && <span style={{ marginLeft: 12, fontSize: 12.5, color: '#DC2626' }}>{erro}</span>}
        <button style={{ height: 38, padding: '0 16px', borderRadius: 999, background: '#ffffff', border: '1px solid rgba(15,23,42,.07)', color: 'rgba(15,23,42,.62)', fontFamily: 'inherit', fontSize: 13.5, cursor: 'pointer' }}>Descartar</button>
      </div>
    </div>
  );
}

function TabSeguranca() {
  const [twoFA, setTwoFA] = useState(false);
  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 4 }}>Segurança</h3>
        <p style={{ fontSize: 13.5, color: 'rgba(15,23,42,.45)' }}>Gerencie sua senha e autenticação em duas etapas.</p>
      </div>
      <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,.07)', borderRadius: 14, padding: 24 }}>
        <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Alterar senha</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {['Senha atual', 'Nova senha', 'Confirmar nova senha'].map(l => (
            <div key={l}>
              <label style={{ fontSize: 12, color: 'rgba(15,23,42,.55)', fontWeight: 500, display: 'block', marginBottom: 6 }}>{l}</label>
              <input type="password" placeholder="••••••••" style={{ width: '100%', height: 42, padding: '0 14px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15,23,42,.1)', color: '#0f172a', fontSize: 14, outline: 'none' }} />
            </div>
          ))}
          <button style={{ height: 30, padding: '0 14px', borderRadius: 999, background: '#2563EB', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
            Atualizar senha
          </button>
        </div>
      </div>
      <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,.07)', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Autenticação em duas etapas</h4>
            <p style={{ fontSize: 13, color: 'rgba(15,23,42,.45)' }}>Adicione uma camada extra de segurança.</p>
          </div>
          <Toggle value={twoFA} onChange={setTwoFA} />
        </div>
        {twoFA && <div style={{ marginTop: 16, padding: 14, background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.2)', borderRadius: 10, fontSize: 13, color: 'rgba(15,23,42,.65)' }}>2FA ativo via aplicativo autenticador.</div>}
      </div>
    </div>
  );
}

function TabNotificacoes() {
  const [notifs, setNotifs] = useState({ geracaoConcluida: true, limitePlano: true, novidades: false, relatorioSemanal: true });
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const items = [
    { key: 'geracaoConcluida', label: 'Geração concluída',         desc: 'E-mail quando um lote terminar de processar.' },
    { key: 'limitePlano',      label: 'Alertas de limite do plano', desc: 'Aviso ao atingir 80% e 100% do limite mensal.' },
    { key: 'novidades',        label: 'Novidades e funcionalidades',desc: 'Fique por dentro das atualizações do produto.' },
    { key: 'relatorioSemanal', label: 'Relatório semanal',          desc: 'Resumo das gerações toda segunda-feira.' },
  ];
  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 4 }}>Notificações</h3>
        <p style={{ fontSize: 13.5, color: 'rgba(15,23,42,.45)' }}>Escolha quando e como quer ser notificado.</p>
      </div>
      <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,.07)', borderRadius: 14, overflow: 'hidden' }}>
        {items.map(({ key, label, desc }, i, arr) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: i < arr.length - 1 ? '1px solid rgba(15,23,42,.06)' : 'none' }}>
            <div style={{ flex: 1, paddingRight: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(15,23,42,.45)' }}>{desc}</div>
            </div>
            <Toggle value={notifs[key]} onChange={v => setNotifs(n => ({ ...n, [key]: v }))} />
          </div>
        ))}
      </div>
      <button onClick={handleSave} style={{ height: 30, padding: '0 14px', borderRadius: 999, background: '#2563EB', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7 }}>
        {saved ? <><Check size={14} /> Salvo!</> : 'Salvar preferências'}
      </button>
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('perfil');
  const content = { perfil: <TabPerfil />, seguranca: <TabSeguranca />, notificacoes: <TabNotificacoes /> };
  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Topbar title="Configurações" subtitle="Gerencie sua conta e preferências" />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar tabs */}
          <div style={{ width: 210, borderRight: '1px solid rgba(15,23,42,.07)', padding: '16px 12px', flexShrink: 0 }}>
            {TABS.map(({ key, icon: Icon, label }) => {
              const active = tab === key;
              return (
                <div key={key} onClick={() => setTab(key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', background: active ? '#eef1f5' : 'transparent', color: active ? '#0f172a' : 'rgba(15,23,42,.55)', marginBottom: 4, transition: 'all .12s' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(15,23,42,.04)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={16} strokeWidth={1.8} style={{ color: active ? '#2563EB' : 'rgba(15,23,42,.38)' }} />
                  <span style={{ fontSize: 13.5, fontWeight: active ? 500 : 400 }}>{label}</span>
                </div>
              );
            })}
          </div>
          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
            <div key={tab} className="rise">{content[tab]}</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
