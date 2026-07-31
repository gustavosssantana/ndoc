import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const CONFIG = {
  success: { icon: CheckCircle, color: 'var(--green)',  bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.2)' },
  error:   { icon: AlertCircle, color: 'var(--red)',    bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
  info:    { icon: Info,        color: 'var(--blue)',   bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)' },
  warning: { icon: AlertTriangle, color: 'var(--yellow)', bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.2)' },
};

function ToastItem({ toast, onRemove }) {
  const cfg = CONFIG[toast.type] ?? CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '13px 14px',
      background: 'var(--surface)',
      border: `1px solid ${cfg.border}`,
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      animation: 'toastSlide 0.22s ease-out',
      minWidth: 280,
      maxWidth: 380,
    }}>
      <Icon size={16} color={cfg.color} style={{ flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 13.5, color: 'var(--text)', flex: 1, lineHeight: 1.45 }}>
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, flexShrink: 0,
          borderRadius: 4, color: 'var(--text-mute)',
          transition: 'color 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mute)'}
      >
        <X size={12} />
      </button>
    </div>
  );
}

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}
