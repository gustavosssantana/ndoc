import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  style,
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center',
      ...style,
    }}>
      {Icon && (
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16, color: 'var(--text-mute)',
        }}>
          <Icon size={22} strokeWidth={1.5} />
        </div>
      )}
      <h3 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 13, color: 'var(--text-mute)', maxWidth: 320, lineHeight: 1.55, marginBottom: action ? 20 : 0 }}>
          {description}
        </p>
      )}
      {action && (
        <Button variant="primary" onClick={action}>{actionLabel || 'Criar'}</Button>
      )}
    </div>
  );
}
