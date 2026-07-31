import { useState } from 'react';
import { Download, Plus, Check } from 'lucide-react';
import { useAccount } from '../contexts/AccountContext';
import AppLayout from '../components/layout/AppLayout';
import { useLayout } from '../contexts/LayoutContext';
import Topbar from '../components/layout/Topbar';

const plans = [
  { key: 'starter',    name: 'Starter',    price: 0,    priceAnnual: 0,   highlight: false, features: ['20 gerações por mês', 'Até 3 templates', '1 usuário', 'Download em .docx', 'Suporte por e-mail'] },
  { key: 'pro',        name: 'Pro',         price: 79,   priceAnnual: 63,  highlight: true,  features: ['500 gerações por mês', 'Templates ilimitados', 'Até 3 usuários', 'DOCX e PDF', 'Geração em lote', 'Suporte prioritário'] },
  { key: 'business',   name: 'Business',    price: 249,  priceAnnual: 199, highlight: false, features: ['5.000 gerações por mês', 'Templates ilimitados', 'Até 10 usuários', 'API REST completa', 'Webhooks', 'SLA 99.9%'] },
  { key: 'enterprise', name: 'Enterprise',  price: null, priceAnnual: null,highlight: false, features: ['Gerações ilimitadas', 'Usuários ilimitados', 'API + SSO/SAML', 'Onboarding dedicado', 'SLA customizado', 'Fatura mensal'] },
];

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#2563EB' : 'rgba(15,23,42,.12)', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: value ? 20 : 3, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
    </div>
  );
}

export default function Pricing() {
  const { isMobile, isTablet } = useLayout();
  const { conta, consumo } = useAccount();
  const current = conta.plano;   // vem de GET /api/account
  const [annual, setAnnual] = useState(false);
  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Topbar title="Plano & Cobrança" subtitle="Gerencie sua assinatura" />
        <div className="stagger" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <span style={{ fontSize: 14, color: annual ? 'rgba(15,23,42,.45)' : '#0f172a', fontWeight: annual ? 400 : 500 }}>Mensal</span>
            <Toggle value={annual} onChange={setAnnual} />
            <span style={{ fontSize: 14, color: annual ? '#0f172a' : 'rgba(15,23,42,.45)', fontWeight: annual ? 500 : 400 }}>Anual</span>
            {annual && <span style={{ background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.3)', color: '#16A34A', borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>–20%</span>}
          </div>

          {/* Plan cards */}
          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16 }}>
            {plans.map(plan => {
              const isCurrent = plan.key === current;
              return (
                <div key={plan.key} className="hoverable" style={{ background: plan.highlight ? 'linear-gradient(180deg,rgba(37,99,235,.13),rgba(37,99,235,.03) 60%),#ffffff' : '#ffffff', border: isCurrent ? '2px solid #2563EB' : plan.highlight ? '1px solid rgba(37,99,235,.3)' : '1px solid rgba(15,23,42,.07)', borderRadius: 16, padding: '24px 22px', position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {isCurrent && (
                    <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#2563EB', color: '#fff', borderRadius: 999, padding: '3px 14px', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>PLANO ATUAL</div>
                  )}
                  <div>
                    <div style={{ fontSize: 13, color: 'rgba(15,23,42,.5)', marginBottom: 6, fontWeight: 500 }}>{plan.name}</div>
                    {plan.price === null
                      ? <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: '-0.03em' }}>Consultar</div>
                      : plan.price === 0
                        ? <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: '-0.03em' }}>Grátis</div>
                        : <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: '-0.03em' }}>R${annual ? plan.priceAnnual : plan.price}</span>
                            <span style={{ fontSize: 12, color: 'rgba(15,23,42,.38)' }}>/mês</span>
                          </div>}
                  </div>
                  <div style={{ height: 1, background: 'rgba(15,23,42,.06)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: plan.highlight ? 'rgba(37,99,235,.2)' : 'rgba(74,222,128,.12)', border: `1px solid ${plan.highlight ? 'rgba(37,99,235,.35)' : 'rgba(74,222,128,.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <Check size={10} strokeWidth={3} style={{ color: plan.highlight ? '#2563EB' : '#4ADE80' }} />
                        </div>
                        <span style={{ color: 'rgba(15,23,42,.7)', lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    {isCurrent
                      ? <button disabled title="Este é o seu plano" style={{ cursor: 'default', width: '100%', height: 38, borderRadius: 999, background: 'rgba(37,99,235,.12)', border: '1px solid rgba(37,99,235,.35)', color: '#2563EB', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'default' }}>Plano atual</button>
                      : plan.price === null
                        ? <button disabled title="Em breve — a cobrança ainda não está integrada" style={{ opacity: .5, cursor: 'not-allowed',  width: '100%', height: 38, borderRadius: 999, background: 'transparent', border: '1px solid rgba(15,23,42,.12)', color: '#0f172a', fontFamily: 'inherit', fontSize: 13.5, cursor: 'pointer' }}>Falar com vendas</button>
                        : plan.price < 79
                          ? <button disabled title="Em breve — a cobrança ainda não está integrada" style={{ opacity: .5, cursor: 'not-allowed',  width: '100%', height: 38, borderRadius: 999, background: 'transparent', border: '1px solid rgba(15,23,42,.12)', color: '#0f172a', fontFamily: 'inherit', fontSize: 13.5, cursor: 'pointer' }}>Fazer downgrade</button>
                          : <button disabled title="Em breve — a cobrança ainda não está integrada" style={{ opacity: .5, cursor: 'not-allowed',  width: '100%', height: 38, borderRadius: 999, background: '#2563EB', border: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#3B82F6'} onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>Fazer upgrade</button>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Billing history */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em' }}>Histórico de cobrança</h3>
              <button disabled title="Em breve — a cobrança ainda não está integrada" style={{ opacity: .5, cursor: 'not-allowed',  height: 30, padding: '0 12px', borderRadius: 999, background: '#ffffff', border: '1px solid rgba(15,23,42,.07)', color: 'rgba(15,23,42,.7)', fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={13} /> Exportar
              </button>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,.07)', borderRadius: 12, overflow: 'hidden' }}>
              <table className="gt-table">
                <thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Status</th><th style={{ textAlign: 'right' }}>Nota</th></tr></thead>
                <tbody>
                  {[['17/05/2025','Plano Pro – Junho 2025','R$ 79,00'],['17/04/2025','Plano Pro – Maio 2025','R$ 79,00'],['17/03/2025','Plano Pro – Abril 2025','R$ 79,00'],['17/02/2025','Plano Pro – Março 2025','R$ 79,00']].map(([date, desc, value]) => (
                    <tr key={date}>
                      <td style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12.5, color: 'rgba(15,23,42,.5)' }}>{date}</td>
                      <td>{desc}</td>
                      <td style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, fontSize: 13 }}>{value}</td>
                      <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.3)', color: '#16A34A', borderRadius: 999, padding: '1px 9px', fontSize: 11.5 }}>Pago</span></td>
                      <td style={{ textAlign: 'right' }}><button disabled title="Em breve — a cobrança ainda não está integrada" style={{ opacity: .5, cursor: 'not-allowed',  height: 28, padding: '0 10px', borderRadius: 999, background: '#ffffff', border: '1px solid rgba(15,23,42,.07)', color: 'rgba(15,23,42,.6)', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Download size={12} />PDF</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Buy credits */}
          <div style={{ background: 'linear-gradient(135deg,rgba(37,99,235,.10),rgba(37,99,235,.03)),#ffffff', border: '1px solid rgba(37,99,235,.25)', borderRadius: 14, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Precisa de mais gerações?</h4>
              <p style={{ fontSize: 13.5, color: 'rgba(15,23,42,.55)' }}>Compre créditos avulsos a partir de <b style={{ color: '#2563EB' }}>R$ 0,14</b> por geração.</p>
            </div>
            <button disabled title="Em breve — a cobrança ainda não está integrada" style={{ opacity: .5, cursor: 'not-allowed',  height: 38, padding: '0 16px', borderRadius: 999, background: '#2563EB', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }} onMouseEnter={e => e.currentTarget.style.background = '#3B82F6'} onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
              <Plus size={16} /> Comprar créditos
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
