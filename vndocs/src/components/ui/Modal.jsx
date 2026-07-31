import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closable = true,
}) {
  const widths = { sm: 420, md: 560, lg: 700 };
  const w = widths[size] ?? 560;

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape' && closable) onClose?.();
  }, [closable, onClose]);

  useEffect(() => {
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, handleKey]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={e => { if (e.target === e.currentTarget && closable) onClose?.(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: w,
          background: 'var(--surface)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          animation: 'fadeUp 0.2s ease-out',
          margin: '0 16px',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 16px',
          borderBottom: '1px solid var(--line)',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{title}</h2>
          {closable && (
            <button
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28,
                borderRadius: 6,
                color: 'var(--text-mute)',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.08)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-mute)'; }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 8,
            padding: '14px 22px',
            borderTop: '1px solid var(--line)',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* Convenience delete-confirm modal */
export function ConfirmModal({ open, onClose, onConfirm, loading, title, description }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Confirmar ação'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>Excluir</Button>
        </>
      }
    >
      <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.55 }}>
        {description || 'Esta ação não pode ser desfeita. Deseja continuar?'}
      </p>
    </Modal>
  );
}
