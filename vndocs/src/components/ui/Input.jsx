import { forwardRef, useState } from 'react';

const baseInput = {
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--line-strong)',
  borderRadius: 'var(--radius)',
  color: 'var(--text)',
  fontSize: '13.5px',
  padding: '9px 13px',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  outline: 'none',
  lineHeight: 1.4,
};

function Field({ label, error, helper, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.02em' }}>
          {label}
          {required && <span style={{ color: 'var(--orange)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      {children}
      {error && <p style={{ fontSize: 11.5, color: 'var(--red)', marginTop: -2 }}>{error}</p>}
      {helper && !error && <p style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: -2 }}>{helper}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { label, error, helper, required, wrapStyle, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} error={error} helper={helper} required={required}>
      <input
        ref={ref}
        style={{
          ...baseInput,
          borderColor: error ? 'var(--red)' : focused ? 'var(--orange)' : 'var(--line-strong)',
          boxShadow: focused ? '0 0 0 3px var(--orange-dim)' : 'none',
          ...wrapStyle,
        }}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, helper, required, rows = 4, wrapStyle, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} error={error} helper={helper} required={required}>
      <textarea
        ref={ref}
        rows={rows}
        style={{
          ...baseInput,
          resize: 'vertical',
          minHeight: 80,
          borderColor: error ? 'var(--red)' : focused ? 'var(--orange)' : 'var(--line-strong)',
          boxShadow: focused ? '0 0 0 3px var(--orange-dim)' : 'none',
          ...wrapStyle,
        }}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
    </Field>
  );
});

export const Select = forwardRef(function Select(
  { label, error, helper, required, options = [], wrapStyle, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} error={error} helper={helper} required={required}>
      <div style={{ position: 'relative' }}>
        <select
          ref={ref}
          style={{
            ...baseInput,
            appearance: 'none',
            paddingRight: 32,
            cursor: 'pointer',
            borderColor: error ? 'var(--red)' : focused ? 'var(--orange)' : 'var(--line-strong)',
            boxShadow: focused ? '0 0 0 3px var(--orange-dim)' : 'none',
            ...wrapStyle,
          }}
          onFocus={e => { setFocused(true); props.onFocus?.(e); }}
          onBlur={e => { setFocused(false); props.onBlur?.(e); }}
          {...props}
        >
          <option value="">Selecione...</option>
          {options.map(o => (
            typeof o === 'string'
              ? <option key={o} value={o}>{o}</option>
              : <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {/* Chevron */}
        <svg
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-mute)' }}
          width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </Field>
  );
});

export default Input;
