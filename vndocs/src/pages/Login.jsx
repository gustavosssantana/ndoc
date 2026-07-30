import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, FileText, Table2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function PasswordInput({ label, placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: 'rgba(15,23,42,.62)', fontWeight: 500 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ width: '100%', height: 42, padding: '0 44px 0 14px', borderRadius: 10, background: '#ffffff', border: `1px solid ${focus ? '#2563EB' : 'rgba(15,23,42,.07)'}`, color: '#0f172a', fontSize: 14, outline: 'none', transition: 'border-color .15s' }}
        />
        <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(15,23,42,.38)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function TextInput({ label, placeholder, value, onChange, type = 'text' }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: 'rgba(15,23,42,.62)', fontWeight: 500 }}>{label}</label>}
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ width: '100%', height: 42, padding: '0 14px', borderRadius: 10, background: '#ffffff', border: `1px solid ${focus ? '#2563EB' : 'rgba(15,23,42,.07)'}`, color: '#0f172a', fontSize: 14, outline: 'none', transition: 'border-color .15s' }}
      />
    </div>
  );
}

function MarketingPanel() {
  return (
    <div style={{ flex: 1, background: 'radial-gradient(800px 600px at 70% 30%, rgba(37,99,235,.12), transparent 60%), #eef2f8', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(15,23,42,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.025) 1px,transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse at 60% 40%,#000 30%,transparent 75%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: '#2563EB', letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>GERAÇÃO EM MASSA</div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 42, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 16 }}>
          Transforme templates<br />em <span style={{ color: '#2563EB' }}>centenas</span> de docs.
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(15,23,42,.55)', lineHeight: 1.6, maxWidth: 400, marginBottom: 32 }}>
          Suba seu modelo Word, conecte uma planilha Excel e gere todos os documentos preenchidos automaticamente.
        </p>
        {/* Demo visual */}
        <div style={{ background: 'rgba(15,23,42,.03)', border: '1px solid rgba(15,23,42,.07)', borderRadius: 16, padding: '22px 24px', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            {[
              { Icon: FileText, label: 'Contrato.docx', sub: '12 variáveis', bg: 'rgba(74,144,226,.2)', bc: 'rgba(74,144,226,.3)', c: '#60a5fa' },
              { Icon: Table2, label: 'Clientes.xlsx', sub: '82 linhas', bg: 'rgba(74,222,128,.15)', bc: 'rgba(74,222,128,.25)', c: '#4ADE80' },
            ].map(({ Icon, label, sub, bg, bc, c }, i) => (
              <div key={label} style={{ display: 'contents' }}>
                {i > 0 && <div style={{ color: 'rgba(37,99,235,.6)', fontSize: 20 }}>+</div>}
                <div style={{ flex: 1, background: '#ffffff', border: '1px solid rgba(15,23,42,.08)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: bg, border: `1px solid ${bc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c }}>
                    <Icon size={15} />
                  </div>
                  <div><div style={{ fontSize: 12, fontWeight: 500 }}>{label}</div><div style={{ fontSize: 10.5, color: 'rgba(15,23,42,.38)' }}>{sub}</div></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ width: '100%', height: 6, background: 'rgba(15,23,42,.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg,#2563EB,#3B82F6)', borderRadius: 3, animation: 'barFill 2s ease-out infinite' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>82 documentos prontos</span>
            </div>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'rgba(15,23,42,.38)' }}>3.2s</span>
          </div>
        </div>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 24, paddingTop: 24, borderTop: '1px solid rgba(15,23,42,.07)' }}>
          {[['10k+', 'Documentos gerados'], ['350+', 'Usuários ativos'], ['99.8%', 'Disponibilidade']].map(([v, l]) => (
            <div key={v}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: '-0.03em', color: '#2563EB' }}>{v}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(15,23,42,.38)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div className="rise" style={{ width: 480, flexShrink: 0, background: '#f6f7f9', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 52px', overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
          <img src="/logo.svg" alt="ndocs" style={{ height: 30, width: 'auto', display: 'block' }} />
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 30, letterSpacing: '-0.03em', marginBottom: 8 }}>Bem-vindo de volta</h1>
        <p style={{ fontSize: 14, color: 'rgba(15,23,42,.55)', lineHeight: 1.5, marginBottom: 28 }}>Entre com sua conta para continuar gerando documentos.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TextInput label="E-mail" placeholder="gustavo@empresa.com" value={email} onChange={setEmail} type="email" />
          <PasswordInput label="Senha" placeholder="Sua senha" value={pass} onChange={setPass} />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button style={{ fontSize: 12.5, color: 'rgba(37,99,235,.85)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Esqueceu a senha?
            </button>
          </div>

          <button
            onClick={handleLogin} disabled={loading}
            style={{ width: '100%', height: 46, borderRadius: 999, background: loading ? '#3B82F6' : '#2563EB', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .15s' }}
          >
            {loading ? (
              <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="gt-spin"><circle cx="12" cy="12" r="10" stroke="rgba(15,23,42,.3)" strokeWidth="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></svg> Entrando...</>
            ) : 'Entrar na conta'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(15,23,42,.07)' }} />
            <span style={{ fontSize: 12, color: 'rgba(15,23,42,.38)', fontWeight: 500 }}>ou</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(15,23,42,.07)' }} />
          </div>

          <button
            onClick={handleLogin}
            style={{ width: '100%', height: 44, borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15,23,42,.10)', color: '#0f172a', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            onMouseEnter={e => e.currentTarget.style.background = '#eef1f5'}
            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
          >
            <GoogleIcon /> Entrar com Google
          </button>
        </div>

        <p style={{ marginTop: 28, fontSize: 13, color: 'rgba(15,23,42,.45)', textAlign: 'center' }}>
          Não tem conta?{' '}
          <button onClick={() => navigate('/register')} style={{ background: 'none', border: 'none', color: '#2563EB', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            Criar conta grátis
          </button>
        </p>
        <p style={{ marginTop: 24, fontSize: 11, color: 'rgba(15,23,42,.25)', textAlign: 'center', lineHeight: 1.6 }}>
          Ao entrar, você concorda com os <span style={{ color: 'rgba(15,23,42,.45)' }}>Termos de Uso</span> e a <span style={{ color: 'rgba(15,23,42,.45)' }}>Política de Privacidade</span>.
        </p>
      </div>
      <MarketingPanel />
    </div>
  );
}
