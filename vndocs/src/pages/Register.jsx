import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, FileText, Table2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../contexts/LayoutContext';
import { useToast } from '../contexts/ToastContext';


function FieldInput({ label, placeholder, value, onChange, type = 'text', hint }) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: 'rgba(15,23,42,.62)', fontWeight: 500 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          type={isPass && !show ? 'password' : 'text'} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ width: '100%', height: 42, padding: `0 ${isPass ? 44 : 14}px 0 14px`, borderRadius: 10, background: '#ffffff', border: `1px solid ${focus ? '#2563EB' : 'rgba(15,23,42,.07)'}`, color: '#0f172a', fontSize: 14, outline: 'none', transition: 'border-color .15s' }}
        />
        {isPass && (
          <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(15,23,42,.38)', cursor: 'pointer', display: 'flex' }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && <span style={{ fontSize: 11.5, color: 'rgba(15,23,42,.38)' }}>{hint}</span>}
    </div>
  );
}

function MarketingPanel() {
  return (
    <div style={{ flex: 1, background: 'radial-gradient(800px 600px at 70% 30%, rgba(37,99,235,.12), transparent 60%), #eef2f8', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(15,23,42,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.025) 1px,transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse at 60% 40%,#000 30%,transparent 75%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: '#2563EB', letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>COMECE GRÁTIS</div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 38, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 16 }}>
          20 gerações<br />por mês,{' '}<span style={{ color: '#2563EB' }}>sem custo</span>.
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(15,23,42,.55)', lineHeight: 1.6, maxWidth: 400, marginBottom: 32 }}>
          Crie sua conta agora e comece a gerar documentos em segundos. Upgrade quando precisar.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            '✓  Sem cartão de crédito',
            '✓  20 gerações/mês grátis',
            '✓  Templates ilimitados no plano pago',
            '✓  Suporte via e-mail incluído',
          ].map(txt => (
            <div key={txt} style={{ fontSize: 14, color: 'rgba(15,23,42,.75)', display: 'flex', alignItems: 'center', gap: 10 }}>{txt}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 24, paddingTop: 28, marginTop: 28, borderTop: '1px solid rgba(15,23,42,.07)' }}>
          {[['10k+', 'Docs gerados'], ['350+', 'Usuários ativos'], ['99.8%', 'Uptime']].map(([v, l]) => (
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

export default function Register() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [pass, setPass] = useState('');
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Cria a conta no servidor e já entra. As regras de senha estão em
   * lib/auth.js e o erro devolvido pela API é mostrado como está.
   */
  const handleRegister = async () => {
    if (!email.trim()) {
      toast.error('Informe seu e-mail para criar a conta.');
      return;
    }
    if (pass.length < 8) {
      toast.error('A senha precisa de pelo menos 8 caracteres.');
      return;
    }
    if (!terms) {
      toast.warning('Aceite os termos para continuar.');
      return;
    }
    setLoading(true);
    try {
      await register({
        email: email.trim(),
        senha: pass,
        nome: name.trim(),
        empresa: company.trim(),
      });
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Não foi possível criar a conta. Tente de novo.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', height: isMobile ? 'auto' : '100vh', overflow: isMobile ? 'visible' : 'hidden' }}>
      <div className="rise" style={{ width: isMobile ? '100%' : 500, flexShrink: 0, background: '#f6f7f9', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 52px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          <img src="/logo.svg" alt="ndocs" style={{ height: 30, width: 'auto', display: 'block' }} />
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 28, letterSpacing: '-0.03em', marginBottom: 8 }}>Criar conta grátis</h1>
        <p style={{ fontSize: 14, color: 'rgba(15,23,42,.55)', lineHeight: 1.5, marginBottom: 26 }}>
          20 gerações por mês sem custo. Upgrade quando precisar.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FieldInput label="Nome completo" placeholder="Gustavo Vita" value={name} onChange={setName} />
          <FieldInput label="E-mail profissional" placeholder="gustavo@empresa.com" value={email} onChange={setEmail} type="email" />
          <FieldInput label="Empresa (opcional)" placeholder="Vita Consultoria" value={company} onChange={setCompany} />
          <FieldInput label="Senha" type="password" placeholder="Mínimo 8 caracteres" value={pass} onChange={setPass} hint="Use letras, números e símbolos para maior segurança." />

          {/* Terms */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <div
              onClick={() => setTerms(t => !t)}
              style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${terms ? '#2563EB' : 'rgba(15,23,42,.2)'}`, background: terms ? '#2563EB' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all .15s' }}
            >
              {terms && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <span style={{ fontSize: 12.5, color: 'rgba(15,23,42,.55)', lineHeight: 1.4 }}>
              Concordo com os <span style={{ color: '#2563EB', cursor: 'pointer' }}>Termos de Uso</span> e a <span style={{ color: '#2563EB', cursor: 'pointer' }}>Política de Privacidade</span>
            </span>
          </div>

          <button
            onClick={handleRegister} disabled={loading || !terms}
            style={{ width: '100%', height: 46, borderRadius: 999, background: loading || !terms ? 'rgba(37,99,235,.5)' : '#2563EB', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, cursor: loading || !terms ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .15s' }}
          >
            {loading ? (<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="gt-spin"><circle cx="12" cy="12" r="10" stroke="rgba(15,23,42,.3)" strokeWidth="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></svg> Criando conta...</>) : 'Criar conta grátis'}
          </button>


        </div>

        <p style={{ marginTop: 24, fontSize: 13, color: 'rgba(15,23,42,.45)', textAlign: 'center' }}>
          Já tem conta?{' '}
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#2563EB', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            Fazer login
          </button>
        </p>
      </div>
      {!isMobile && <MarketingPanel />}
    </div>
  );
}
