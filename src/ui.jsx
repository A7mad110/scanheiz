export const fmt = (v, d = 0) =>
  Number(v || 0).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export function Num({ label, sub, unit, value, onChange, placeholder, step = 'any' }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {sub && <span className="field-sub">{sub}</span>}
      <span className="field-input">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value ?? ''}
          placeholder={placeholder || '0'}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
    </label>
  )
}

export function Chips({ options, value, onChange, className = '' }) {
  return (
    <div className={'chips ' + className}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          className={'chip' + (String(value) === String(o.value) ? ' on' : '')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.sub && <small>{o.sub}</small>}
        </button>
      ))}
    </div>
  )
}

export function Stat({ k, v, unit, tone }) {
  return (
    <div className="stat">
      <span className="k">{k}</span>
      <span className={'v' + (tone ? ' ' + tone : '')}>
        {v} {unit && <small>{unit}</small>}
      </span>
    </div>
  )
}

export function WpBars({ items }) {
  if (!items?.length) return null
  return (
    <div className="wp-row">
      {items.map((w) => (
        <div className="wp-item" key={w.key}>
          <span>{w.label} °C</span>
          <span className="bar">
            <i
              style={{
                width: Math.max(2, Math.min(100, w.cover * 100)) + '%',
                background: w.cover >= 1 ? 'var(--ok)' : w.cover >= 0.85 ? 'var(--warn)' : 'var(--bad)',
              }}
            />
          </span>
          <b>{fmt(w.cover * 100)}%</b>
        </div>
      ))}
    </div>
  )
}
