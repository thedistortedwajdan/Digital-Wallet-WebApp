import { useState } from 'react';
import Icon from './Icon.jsx';
import { BANKS } from '../lib/iban.js';

export function Field({ id, label, icon, type = 'text', value, onChange, error, help, placeholder, auto = 'off', max, inputMode, mono, name }) {
  const [shown, setShown] = useState(false);
  const isPw = type === 'password';
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={'inw' + (error ? ' e' : '')}>
        {icon && <Icon name={icon} />}
        <input
          id={id} name={name || id} type={isPw && shown ? 'text' : type} value={value}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={auto}
          maxLength={max} inputMode={inputMode} spellCheck={false}
          style={mono ? { fontFamily: 'var(--m)', fontSize: 15 } : undefined}
        />
        {isPw && (
          <button type="button" className="peek" onClick={() => setShown((v) => !v)} aria-label={shown ? 'Hide' : 'Show'}>
            <Icon name="eye" />
          </button>
        )}
      </div>
      {help && !error && <span className="help">{help}</span>}
      {error && <span className="err">{error}</span>}
    </div>
  );
}

export function AmountField({ id, label = 'Amount', value, onChange, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={'inw big' + (error ? ' e' : '')}>
        <span className="cur">$</span>
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal"
          placeholder="0.00" autoComplete="off" />
      </div>
      {error && <span className="err">{error}</span>}
      {children}
    </div>
  );
}

export function Note({ tone = '', icon = 'info', children, role }) {
  return (
    <div className={'note ' + tone} role={role}>
      <Icon name={icon} size={17} />
      <span>{children}</span>
    </div>
  );
}

export function BankBadge({ code, size }) {
  const bank = BANKS[code];
  return (
    <span className={'bk ' + (bank ? bank.tone : '')} style={size ? { width: size, height: size } : undefined}>
      {bank ? bank.name[0] : '?'}
    </span>
  );
}

export function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export function Button({ busy, tone = '', small, children, ...rest }) {
  return (
    <button type="button" {...rest} disabled={rest.disabled || busy}
      className={['btn', tone, small ? 's' : '', busy ? 'busy' : '', rest.className || ''].join(' ').replace(/\s+/g, ' ').trim()}>
      {children}
    </button>
  );
}

export function PasswordMeter({ value }) {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 16) score++;
  if (!value) score = 0;
  const colour = score < 2 ? 'var(--neg)' : score < 3 ? '#C99A00' : 'var(--pos)';
  return (
    <div className="row" style={{ gap: 6 }}>
      {[0, 1, 2, 3].map((i) => (
        <i key={i} style={{ flex: 1, height: 5, borderRadius: 9, background: i < score ? colour : 'var(--line)' }} />
      ))}
      <span className="help" style={{ marginLeft: 8, minWidth: 56 }}>
        {value ? ['Too short', 'Weak', 'Good', 'Strong', 'Strong'][score] : ''}
      </span>
    </div>
  );
}
