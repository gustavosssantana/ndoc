import { forwardRef } from 'react';
import Spinner from './Spinner';

const SIZE = {
  sm: { padding: '5px 12px', fontSize: '12px', height: 30 },
  md: { padding: '7px 16px', fontSize: '13.5px', height: 36 },
  lg: { padding: '10px 22px', fontSize: '14.5px', height: 42 },
};

const VARIANT = {
  primary: {
    background: 'var(--orange)',
    color: 'var(--n0)',
    border: 'none',
    hover: { background: 'var(--orange-2)' },
  },
  secondary: {
    background: 'var(--surface-2)',
    color: 'var(--text)',
    border: '1px solid var(--line-strong)',
    hover: { background: 'var(--surface-3)' },
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-dim)',
    border: '1px solid transparent',
    hover: { background: 'rgba(15,23,42,0.06)', color: 'var(--text)' },
  },
  danger: {
    background: 'rgba(248,113,113,0.12)',
    color: 'var(--red)',
    border: '1px solid rgba(248,113,113,0.2)',
    hover: { background: 'rgba(248,113,113,0.2)' },
  },
  orange_outline: {
    background: 'transparent',
    color: 'var(--orange)',
    border: '1px solid var(--orange)',
    hover: { background: 'var(--orange-dim)' },
  },
};

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon = null,
    iconRight: IconRight = null,
    children,
    style,
    ...props
  },
  ref
) {
  const v = VARIANT[variant] ?? VARIANT.primary;
  const s = SIZE[size] ?? SIZE.md;

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 'var(--radius)',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
        transition: 'background 0.13s, color 0.13s, border-color 0.13s, opacity 0.13s',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...v,
        ...s,
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, v.hover);
        }
      }}
      onMouseLeave={e => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, {
            background: v.background,
            color: v.color,
            borderColor: '',
          });
        }
      }}
      {...props}
    >
      {loading ? (
        <Spinner size={14} color="currentColor" />
      ) : Icon ? (
        <Icon size={14} strokeWidth={2} />
      ) : null}
      {children}
      {!loading && IconRight && <IconRight size={14} strokeWidth={2} />}
    </button>
  );
});

export default Button;
