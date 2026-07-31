import { DOCUMENT_TYPES } from '../../config/documentTypes';

const STATUS_CONFIG = {
  completed: { label: 'Concluído',   bg: 'rgba(34,197,94,0.12)',   color: '#16A34A', dot: '#22C55E' },
  processing: { label: 'Gerando',    bg: 'rgba(202,138,4,0.12)',   color: '#CA8A04', dot: '#EAB308', pulse: true },
  failed:    { label: 'Falhou',      bg: 'rgba(220,38,38,0.10)',   color: '#DC2626', dot: '#EF4444' },
};

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.completed;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      <span
        className={cfg.pulse ? 'anim-pulse' : ''}
        style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }}
      />
      {cfg.label}
    </span>
  );
}

export function TypeBadge({ type }) {
  const def = DOCUMENT_TYPES.find(t => t.id === type);
  const color = def?.color || 'var(--text-mute)';
  const label = def?.label ?? type;

  // Abbreviate long labels
  const short = label.length > 22 ? label.slice(0, 20) + '…' : label;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: `${color}18`,
      color,
      fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {short}
    </span>
  );
}

/* Generic colored badge */
export function Badge({ label, color = 'var(--text-mute)', bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 999,
      background: bg || `${color}22`, color,
      fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  );
}

export default StatusBadge;
