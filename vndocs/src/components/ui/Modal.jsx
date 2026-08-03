import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import { X } from 'lucide-react';
import { useIsMobile } from '../../contexts/LayoutContext';

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
  const isMobile = useIsMobile();

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
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        background: 'var(--n6)',
        backdropFilter: 'blur(3px)',
        animation: 'fadeIn .16s ease-out',
      }}
      onClick={e => { if (e.target === e.currentTarget && closable) onClose?.(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : w,
          background: 'var(--surface)',
          border: isMobile ? 'none' : '1px solid var(--line)',
          /* No celular vira uma folha que sobe da base: o polegar alcança,
             e o gesto de fechar é natural. */
          borderRadius: isMobile ? '18px 18px 0 0' : 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--sombra-3)',
          animation: isMobile
            ? 'subirFolha .26s var(--curva)'
            : 'fadeUp .2s var(--curva)',
          margin: isMobile ? 0 : '0 16px',
          maxHeight: isMobile ? '88vh' : '86vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
            <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--n4)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '12px 18px 14px' : '18px 22px 16px',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: isMobile ? 17 : 15, fontWeight: 600, color: 'var(--text)' }}>{title}</h2>
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
        <div className="rolagem-fina" style={{
          padding: isMobile ? '18px 18px 20px' : '20px 22px',
          overflowY: 'auto',
          flex: 1,
        }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 8,
            padding: isMobile ? '12px 18px' : '14px 22px',
            borderTop: '1px solid var(--line)',
            flexShrink: 0,
            paddingBottom: isMobile
              ? 'max(12px, env(safe-area-inset-bottom))'
              : 14,
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
