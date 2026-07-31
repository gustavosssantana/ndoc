import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Table2, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../contexts/LayoutContext';
import { useToast } from '../contexts/ToastContext';

/* ── Campos ───────────────────────────────────────────────────────────── */

function TextInput({ label, placeholder, value, onChange, type = 'text', onEnter }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12.5, color: 'rgba(15,23,42,.62)', fontWeight: 500 }}>{label}</label>}
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onEnter?.(); }}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          width: '100%', height: 46, padding: '0 14px', borderRadius: 10,
          background: '#ffffff', fontFamily: 'inherit', fontSize: 14, outline: 'none',
          border: `1px solid ${focus ? '#2563EB' : 'rgba(15,23,42,.14)'}`,
          boxShadow: focus ? '0 0 0 3px rgba(37,99,235,.12)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      />
    </div>
  );
}

function PasswordInput({ label, placeholder, value, onChange, onEnter }) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12.5, color: 'rgba(15,23,42,.62)', fontWeight: 500 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onEnter?.(); }}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            width: '100%', height: 46, padding: '0 46px 0 14px', borderRadius: 10,
            background: '#ffffff', fontFamily: 'inherit', fontSize: 14, outline: 'none',
            border: `1px solid ${focus ? '#2563EB' : 'rgba(15,23,42,.14)'}`,
            boxShadow: focus ? '0 0 0 3px rgba(37,99,235,.12)' : 'none',
            transition: 'border-color .15s, box-shadow .15s',
          }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          title={show ? 'Ocultar senha' : 'Mostrar senha'}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(15,23,42,.1)',
            background: '#fff', color: 'rgba(15,23,42,.45)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

/* ── Painel da direita ────────────────────────────────────────────────── */

/** Cartão da planilha, ao fundo. */
function CartaoPlanilha() {
  const linhas = [
    ['Ana M.', '123.***', 'R$ 4.200'],
    ['João B.', '456.***', 'R$ 6.500'],
    ['Lia F.', '789.***', 'R$ 3.180'],
  ];
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(15,23,42,.08)', borderRadius: 14,
      padding: '16px 18px', width: 300,
      boxShadow: '0 18px 40px rgba(15,23,42,.10)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: 'rgba(22,163,74,.12)',
          border: '1px solid rgba(22,163,74,.22)', color: '#16A34A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Table2 size={15} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>clientes_marco.xlsx</div>
          <div style={{ fontSize: 11, color: 'rgba(15,23,42,.42)' }}>82 linhas · 7 colunas</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '9px 10px' }}>
        {['NOME', 'CPF', 'VALOR'].map(c => (
          <div key={c} style={{
            fontFamily: "'Geist Mono', monospace", fontSize: 9.5, letterSpacing: '.1em',
            color: 'rgba(15,23,42,.35)',
          }}>{c}</div>
        ))}
        {linhas.map(l => l.map((celula, i) => (
          <div key={l[0] + i} style={{ fontSize: 11.5, color: 'rgba(15,23,42,.62)' }}>{celula}</div>
        )))}
      </div>
    </div>
  );
}

/** Cartão do contrato, com os campos destacados. */
function CartaoContrato() {
  const campo = (t) => (
    <span style={{
      background: 'rgba(37,99,235,.1)', color: '#2563EB', borderRadius: 4,
      padding: '1px 5px', fontFamily: "'Geist Mono', monospace", fontSize: 11,
    }}>{t}</span>
  );
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(15,23,42,.08)', borderRadius: 14,
      padding: '16px 18px', width: 330,
      boxShadow: '0 22px 48px rgba(15,23,42,.13)',
    }}>
      <div style={{
        fontFamily: "'Geist Mono', monospace", fontSize: 9.5, letterSpacing: '.12em',
        color: 'rgba(15,23,42,.38)', marginBottom: 12,
      }}>
        CONTRATO PRESTAÇÃO DE SERVIÇOS
      </div>
      <p style={{ fontSize: 12.5, lineHeight: 1.85, color: 'rgba(15,23,42,.7)', margin: 0 }}>
        Pelo presente instrumento particular, {campo('{{nome}}')}, portador do
        CPF {campo('{{cpf}}')}, contrata os serviços pelo valor
        de {campo('{{valor}}')} …
      </p>
      <div style={{
        marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(15,23,42,.06)',
        fontFamily: "'Geist Mono', monospace", fontSize: 9.5,
        letterSpacing: '.1em', color: 'rgba(15,23,42,.3)',
      }}>
        PÁGINA 1 / 3
      </div>
    </div>
  );
}

/** Cartão azul do resultado. */
function CartaoResultado() {
  return (
    <div style={{
      background: 'linear-gradient(150deg,#2563EB,#1D4ED8)', borderRadius: 14,
      padding: '15px 18px', width: 210, color: '#fff',
      boxShadow: '0 22px 46px rgba(37,99,235,.38)',
    }}>
      <div style={{
        fontFamily: "'Geist Mono', monospace", fontSize: 9.5, letterSpacing: '.12em',
        color: 'rgba(255,255,255,.75)', marginBottom: 6,
      }}>
        GERAÇÃO COMPLETA
      </div>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 34,
        letterSpacing: '-0.03em', lineHeight: 1,
      }}>
        82
      </div>
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>
        arquivos .docx em 3.2s
      </div>
      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.22)',
        display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 500,
      }}>
        <Download size={13} /> Baixar .zip
      </div>
    </div>
  );
}

function PainelMarketing() {
  return (
    <div style={{
      flex: 1,
      background: 'radial-gradient(820px 620px at 68% 26%, rgba(37,99,235,.13), transparent 62%), #eef2f8',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '56px 60px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(15,23,42,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.025) 1px,transparent 1px)',
        backgroundSize: '46px 46px',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontFamily: "'Geist Mono', monospace", fontSize: 12, color: '#2563EB',
          letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 18,
        }}>
          Geração em massa
        </div>

        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 42,
          letterSpacing: '-0.03em', lineHeight: 1.12, margin: 0, marginBottom: 16,
        }}>
          Transforme templates<br />em <span style={{ color: '#2563EB' }}>centenas</span> de docs.
        </h2>

        <p style={{
          fontSize: 15, color: 'rgba(15,23,42,.55)', lineHeight: 1.6,
          maxWidth: 400, marginBottom: 44,
        }}>
          Suba seu modelo Word, conecte uma planilha Excel e gere todos os
          documentos preenchidos automaticamente.
        </p>

        {/* Cartões sobrepostos: planilha → contrato → resultado */}
        <div style={{ position: 'relative', height: 300, marginBottom: 36 }}>
          <div style={{ position: 'absolute', top: 0, left: 0 }}>
            <CartaoPlanilha />
          </div>
          <div style={{ position: 'absolute', top: 132, left: 96 }}>
            <CartaoContrato />
          </div>
          <div style={{ position: 'absolute', top: 214, left: 244 }}>
            <CartaoResultado />
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 30, paddingTop: 24,
          borderTop: '1px solid rgba(15,23,42,.07)',
        }}>
          {[
            ['2.4M+', 'Documentos gerados'],
            ['3.1s', 'Tempo médio (100 docs)'],
            ['1.8k', 'Equipes ativas'],
          ].map(([v, l]) => (
            <div key={v}>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22,
                letterSpacing: '-0.03em', color: '#2563EB',
              }}>{v}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(15,23,42,.38)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Página ───────────────────────────────────────────────────────────── */

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  /**
   * Autentica no servidor. A sessão vira um cookie HttpOnly; o front nunca
   * vê o token. Sem o login(), o ProtectedRoute não acha sessão e manda de
   * volta para cá.
   */
  const handleLogin = async () => {
    if (!email.trim() || !pass) {
      toast.error('Informe e-mail e senha.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), pass);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Não foi possível entrar. Tente de novo.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fafbfc' }}>
      {/* Formulário */}
      <div style={{
        width: isMobile ? '100%' : 480, flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: isMobile ? '40px 22px' : '48px 52px', background: '#fafbfc',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44 }}>
          <img src="/logo.svg" alt="ndocs" style={{ height: 30, width: 'auto', display: 'block' }} />
        </div>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 30,
          letterSpacing: '-0.03em', margin: 0, marginBottom: 10,
        }}>
          Bem-vindo de volta
        </h1>
        <p style={{
          fontSize: 14, color: 'rgba(15,23,42,.5)', lineHeight: 1.55, margin: 0, marginBottom: 32,
        }}>
          Entre com sua conta para continuar gerando documentos.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <TextInput
            label="E-mail" type="email" placeholder="gustavo@empresa.com"
            value={email} onChange={setEmail} onEnter={handleLogin}
          />
          <PasswordInput
            label="Senha" placeholder="Sua senha"
            value={pass} onChange={setPass} onEnter={handleLogin}
          />

          <button
            onClick={handleLogin} disabled={loading}
            style={{
              height: 48, borderRadius: 10, marginTop: 6,
              background: loading ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none',
              fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 6px 18px rgba(37,99,235,.28)',
              transition: 'background .15s',
            }}
          >
            {loading ? 'Entrando…' : 'Entrar na conta'}
          </button>
        </div>

        <p style={{
          fontSize: 11.5, color: 'rgba(15,23,42,.35)', lineHeight: 1.6,
          textAlign: 'center', marginTop: 30, marginBottom: 0,
        }}>
          Ao entrar, você concorda com os{' '}
          <span style={{ color: 'rgba(15,23,42,.5)' }}>Termos de Uso</span> e a{' '}
          <span style={{ color: 'rgba(15,23,42,.5)' }}>Política de Privacidade</span>.
        </p>
      </div>

      {/* O painel de marketing só aparece quando há espaço para ele. */}
      {!isMobile && <PainelMarketing />}
    </div>
  );
}
