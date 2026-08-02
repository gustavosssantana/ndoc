import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Zap, LayoutGrid, Folder, Clock, CreditCard, Settings, LogOut,
} from 'lucide-react';
import { useAccount } from '../../contexts/AccountContext';
import { Rotulo } from '../ui/Primitivas';

const PRINCIPAL = [
  { to: '/generate', icone: Zap, rotulo: 'Gerar documentos' },
  { to: '/', icone: LayoutGrid, rotulo: 'Visão geral' },
];

const GRUPOS = [
  {
    titulo: 'Arquivos',
    itens: [
      { to: '/biblioteca', icone: Folder, rotulo: 'Biblioteca' },
      { to: '/history', icone: Clock, rotulo: 'Histórico' },
    ],
  },
  {
    titulo: 'Conta',
    itens: [
      { to: '/pricing', icone: CreditCard, rotulo: 'Plano' },
      { to: '/settings', icone: Settings, rotulo: 'Configurações' },
    ],
  },
];

/**
 * Item de navegação.
 *
 * O ativo é marcado por um traço vertical à esquerda, não por um bloco de
 * cor: é a marca de margem de um documento, discreta e inequívoca. Preencher
 * o item inteiro de azul competiria com a ação principal da tela.
 */
function Item({ item, ativo, aoIr }) {
  const [sobre, setSobre] = useState(false);
  const { icone: Icone, rotulo, to } = item;

  return (
    <button
      onClick={() => aoIr(to)}
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 11,
        width: '100%', height: 38, padding: '0 12px 0 14px',
        borderRadius: 'var(--r-p)',
        background: ativo ? 'var(--n2)' : sobre ? 'var(--n1)' : 'transparent',
        color: ativo ? 'var(--n9)' : 'var(--n7)',
        fontFamily: 'inherit', fontSize: 'var(--t-base)',
        fontWeight: ativo ? 600 : 500,
        textAlign: 'left', cursor: 'pointer',
        transition: 'background .15s var(--curva), color .15s var(--curva)',
      }}
    >
      {ativo && (
        <span style={{
          position: 'absolute', left: 0, top: 9, bottom: 9, width: 3,
          borderRadius: '0 3px 3px 0', background: 'var(--azul)',
        }} />
      )}
      <Icone size={17} strokeWidth={ativo ? 2.1 : 1.8} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {rotulo}
      </span>
    </button>
  );
}

/** Consumo do ciclo. Barra fina, número em monoespaçada — é dado, não enfeite. */
function Consumo({ usadas, limite }) {
  const ilimitado = limite === null || limite === undefined;
  const porcento = ilimitado ? 0 : Math.min(100, Math.round((usadas / limite) * 100));
  const apertado = !ilimitado && porcento >= 80;

  return (
    <div style={{ padding: '14px 14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
        <Rotulo>Este ciclo</Rotulo>
        <span style={{
          fontFamily: 'var(--fonte-dado)', fontSize: 'var(--t-mini)',
          color: apertado ? 'var(--ambar)' : 'var(--n7)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {usadas}<span style={{ color: 'var(--n5)' }}>/{ilimitado ? '∞' : limite}</span>
        </span>
      </div>

      <div style={{ height: 4, borderRadius: 999, background: 'var(--n3)', overflow: 'hidden' }}>
        <div style={{
          width: ilimitado ? '100%' : `${porcento}%`,
          height: '100%', borderRadius: 999,
          background: apertado ? 'var(--ambar)' : 'var(--azul)',
          transition: 'width .5s var(--curva)',
        }} />
      </div>

      <div style={{ fontSize: 'var(--t-micro)', color: 'var(--n6)', marginTop: 8, lineHeight: 1.45 }}>
        {ilimitado
          ? 'Gerações ilimitadas'
          : apertado
            ? `Restam ${Math.max(0, limite - usadas)} gerações`
            : `${Math.max(0, limite - usadas)} gerações restantes`}
      </div>
    </div>
  );
}

export default function Sidebar({ aoNavegar }) {
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const { conta, consumo, logout, iniciais } = useAccount();

  const ir = (to) => { navegar(to); aoNavegar?.(); };

  return (
    <aside
      className="rolagem-fina"
      style={{
        width: 244, flexShrink: 0, height: '100%',
        background: 'var(--n0)', borderRight: 'var(--fio)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}
    >
      {/* Marca */}
      <div style={{ padding: '20px 18px 18px' }}>
        <img src="/logo.svg" alt="ndocs" style={{ height: 25, width: 'auto', display: 'block' }} />
      </div>

      {/* Navegação */}
      <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {PRINCIPAL.map((item) => (
          <Item key={item.to} item={item} ativo={pathname === item.to} aoIr={ir} />
        ))}
      </nav>

      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo} style={{ padding: '0 10px', marginTop: 22 }}>
          <Rotulo style={{ padding: '0 14px 8px' }}>{grupo.titulo}</Rotulo>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {grupo.itens.map((item) => (
              <Item key={item.to} item={item} ativo={pathname === item.to} aoIr={ir} />
            ))}
          </div>
        </div>
      ))}

      <div style={{ flex: 1, minHeight: 18 }} />

      {/* Rodapé: consumo e conta */}
      <div style={{ borderTop: 'var(--fio)', margin: '0 0 0', background: 'var(--n1)' }}>
        <Consumo
          usadas={consumo.generationsUsed ?? 0}
          limite={consumo.generationsLimit}
        />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderTop: 'var(--fio)',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: 'var(--n8)', color: 'var(--n0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, letterSpacing: '-0.01em',
          }}>
            {conta.avatar
              ? <img src={conta.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : iniciais}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 'var(--t-mini)', fontWeight: 600, color: 'var(--n9)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {conta.nome || conta.email || '—'}
            </div>
            <div style={{
              fontSize: 'var(--t-micro)', color: 'var(--n6)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              Plano {conta.plano}
            </div>
          </div>

          <button
            onClick={async () => { aoNavegar?.(); await logout(); navegar('/login', { replace: true }); }}
            title="Sair da conta"
            aria-label="Sair da conta"
            className="icone"
            style={{
              width: 32, height: 32, borderRadius: 'var(--r-p)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', color: 'var(--n6)',
              cursor: 'pointer', transition: 'background .15s, color .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--n3)'; e.currentTarget.style.color = 'var(--rubro)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--n6)'; }}
          >
            <LogOut size={15} strokeWidth={1.9} />
          </button>
        </div>
      </div>
    </aside>
  );
}
