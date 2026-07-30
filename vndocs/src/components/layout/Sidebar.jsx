import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Zap, Folder, Clock, Settings, CreditCard } from 'lucide-react';
import { useAccount } from '../../contexts/AccountContext';
import { LogOut } from 'lucide-react';

const NAV_TOP = [
  { to: '/generate', icon: Zap,        label: 'Gerar Documentos' },
  { to: '/',         icon: LayoutGrid, label: 'Dashboard' },
];
const NAV_GROUPS = [
  { title: 'Biblioteca', items: [
    { to: '/biblioteca', icon: Folder, label: 'Biblioteca', badge: 6 },
    { to: '/history',    icon: Clock,  label: 'Histórico', badge: 41 },
  ] },
  { title: 'Conta', items: [
    { to: '/pricing',  icon: CreditCard, label: 'Plano e cobrança' },
    { to: '/settings', icon: Settings,   label: 'Configurações' },
  ] },
];

function NavItem({ item, active, navigate }) {
  const [hov, setHov] = useState(false);
  const { icon: Icon, label, to, badge } = item;
  return (
    <div
      onClick={() => navigate(to)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '9px 11px', borderRadius: 9, cursor: 'pointer',
        color: active ? '#2563EB' : '#0f172a',
        background: active ? 'rgba(37,99,235,.09)' : hov ? 'rgba(15,23,42,.04)' : 'transparent',
        transition: 'background .12s, color .12s', userSelect: 'none',
      }}
    >
      <span style={{ color: active ? '#2563EB' : 'rgba(15,23,42,.45)', display: 'flex', flexShrink: 0 }}>
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Geist Mono', monospace", color: active ? '#2563EB' : 'rgba(15,23,42,.4)', background: active ? 'rgba(37,99,235,.12)' : 'rgba(15,23,42,.05)', borderRadius: 999, padding: '1px 8px' }}>{badge}</span>
      )}
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const route = pathname === '/dashboard' ? '/' : pathname;
  const { conta, consumo, logout } = useAccount();
  const usadas = consumo.generationsUsed ?? 0;
  const limite = consumo.generationsLimit;           // null = ilimitado
  const usePct = limite ? Math.min(100, Math.round((usadas / limite) * 100)) : 0;
  const remaining = limite ? Math.max(0, limite - usadas) : null;

  return (
    <div style={{
      width: 232, background: '#fff',
      borderRight: '1px solid rgba(15,23,42,.08)',
      display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 22px 16px', display: 'flex', alignItems: 'center' }}>
        <img src="/logo.svg" alt="ndocs" style={{ height: 26, width: 'auto', display: 'block' }} />
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_TOP.map(item => (
          <NavItem key={item.to} item={item} active={route === item.to} navigate={navigate} />
        ))}

        {NAV_GROUPS.map(group => (
          <div key={group.title}>
            <div style={{ fontSize: 10.5, color: 'rgba(15,23,42,.35)', textTransform: 'uppercase', letterSpacing: '.1em', padding: '16px 11px 6px', fontWeight: 700 }}>
              {group.title}
            </div>
            {group.items.map(item => (
              <NavItem key={item.to} item={item} active={route === item.to} navigate={navigate} />
            ))}
          </div>
        ))}
      </div>

      {/* Plan progress */}
      <div style={{ padding: 14 }}>
        <div style={{ background: '#fff', border: '1px solid rgba(15,23,42,.1)', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <span style={{ background: 'rgba(37,99,235,.1)', color: '#2563EB', borderRadius: 999, padding: '2px 11px', fontSize: 12, fontWeight: 600 }}>{conta.plano}</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12.5, color: 'rgba(15,23,42,.5)' }}>{usadas}/{limite ?? '∞'}</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'rgba(15,23,42,.07)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${usePct}%`, background: 'linear-gradient(90deg,#2563EB,#3B82F6)', borderRadius: 3, transition: 'width .3s ease' }} />
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(15,23,42,.42)', marginTop: 8 }}>{remaining === null ? 'Gerações ilimitadas' : `${remaining} gerações restantes este mês`}</div>
        </div>

        {/* Conta e saída */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 4px 2px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {conta.nome || conta.email || '—'}
            </div>
            {conta.nome && conta.email && (
              <div style={{ fontSize: 11, color: 'rgba(15,23,42,.42)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conta.email}
              </div>
            )}
          </div>
          <button
            onClick={async () => { await logout(); navigate('/login', { replace: true }); }}
            title="Sair"
            aria-label="Sair da conta"
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 9, background: 'none', border: '1px solid rgba(15,23,42,.1)', color: 'rgba(15,23,42,.55)', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', flexShrink: 0, transition: 'all .12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = 'rgba(220,38,38,.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(15,23,42,.55)'; e.currentTarget.style.borderColor = 'rgba(15,23,42,.1)'; }}
          >
            <LogOut size={13} strokeWidth={2} /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
