import { useMemo } from 'react'
import {
  ROOM_TYPES,
  HK_TYPES,
  HK_LAENGEN,
  HK_HOEHEN,
  VALVES,
  ETAGEN,
  WAND_TYPEN,
  FENSTER_TYPEN,
  DECKE_TYPEN,
  BODEN_TYPEN,
  ANSCHLUESSE,
} from './data.js'
import { calcRoom, roomType, uValues, wpCheckRoom } from './calc.js'
import { newHk } from './model.js'
import CameraField from './CameraField.jsx'
import { fmt, Num, Chips, Stat, WpBars, uid } from './ui.jsx'

/* ---------- Wandliste ---------- */

function Waende({ draft, set }) {
  const list = draft.waende || []
  const upd = (id, patch) => set('waende', list.map((w) => (w.id === id ? { ...w, ...patch } : w)))

  return (
    <div className="list">
      {list.length === 0 && <p className="hint small">ما في جدران مسجّلة — أضف طول كل جدار.</p>}
      {list.map((w) => (
        <div className="led-row" key={w.id}>
          <input
            className="led-num"
            type="number"
            inputMode="decimal"
            step="0.1"
            dir="ltr"
            value={w.laenge ?? ''}
            placeholder="0"
            onChange={(e) => upd(w.id, { laenge: e.target.value })}
          />
          <span className="led-unit">m</span>
          <select
            className="led-sel"
            value={w.typ}
            onChange={(e) => upd(w.id, { typ: e.target.value })}
          >
            {WAND_TYPEN.map((t) => (
              <option key={t.key} value={t.key}>
                {t.ar}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="del"
            aria-label="حذف الجدار"
            onClick={() => set('waende', list.filter((x) => x.id !== w.id))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn ghost sm"
        onClick={() => set('waende', [...list, { id: uid(), laenge: '', typ: 'aussen' }])}
      >
        ＋ أضف جدار
      </button>
    </div>
  )
}

/* ---------- Fensterliste ---------- */

function Fenster({ draft, set }) {
  const list = draft.fenster || []
  const upd = (id, patch) => set('fenster', list.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  return (
    <div className="list">
      {list.map((f, i) => (
        <div className="item-card" key={f.id}>
          <div className="item-head">
            <strong>شبّاك {i + 1}</strong>
            <button
              type="button"
              className="del"
              aria-label="حذف الشبّاك"
              onClick={() => set('fenster', list.filter((x) => x.id !== f.id))}
            >
              ✕
            </button>
          </div>
          <div className="row3">
            <Num label="العرض" unit="m" value={f.breite} onChange={(v) => upd(f.id, { breite: v })} />
            <Num label="الارتفاع" unit="m" value={f.hoehe} onChange={(v) => upd(f.id, { hoehe: v })} />
            <Num
              label="العدد"
              unit="×"
              step="1"
              value={f.anzahl}
              onChange={(v) => upd(f.id, { anzahl: v })}
            />
          </div>
          <Chips
            className="grid4"
            value={f.typ}
            onChange={(v) => upd(f.id, { typ: v })}
            options={FENSTER_TYPEN.map((t) => ({ value: t.key, label: t.ar, sub: t.de }))}
          />
        </div>
      ))}
      <button
        type="button"
        className="btn ghost sm"
        onClick={() =>
          set('fenster', [
            ...list,
            { id: uid(), breite: '1.2', hoehe: '1.4', anzahl: '1', typ: 'alt' },
          ])
        }
      >
        ＋ أضف شبّاك
      </button>
    </div>
  )
}

/* ---------- Türenliste ---------- */

function Tueren({ draft, set }) {
  const list = draft.tueren || []
  const upd = (id, patch) => set('tueren', list.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  return (
    <div className="list">
      {list.map((t, i) => (
        <div className="item-card" key={t.id}>
          <div className="item-head">
            <strong>باب خارجي {i + 1}</strong>
            <button
              type="button"
              className="del"
              aria-label="حذف الباب"
              onClick={() => set('tueren', list.filter((x) => x.id !== t.id))}
            >
              ✕
            </button>
          </div>
          <div className="row3">
            <Num label="العرض" unit="m" value={t.breite} onChange={(v) => upd(t.id, { breite: v })} />
            <Num label="الارتفاع" unit="m" value={t.hoehe} onChange={(v) => upd(t.id, { hoehe: v })} />
            <Num
              label="العدد"
              unit="×"
              step="1"
              value={t.anzahl}
              onChange={(v) => upd(t.id, { anzahl: v })}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn ghost sm"
        onClick={() =>
          set('tueren', [...list, { id: uid(), breite: '1.0', hoehe: '2.1', anzahl: '1' }])
        }
      >
        ＋ أضف باب خارجي
      </button>
    </div>
  )
}

/* ---------- Heizkörperliste ---------- */

function Heizkoerper({ draft, set, project, calc }) {
  const list = draft.hk || []
  const upd = (id, patch) => set('hk', list.map((h) => (h.id === id ? { ...h, ...patch } : h)))

  return (
    <div className="list">
      {list.length === 0 && <p className="hint small">ما في شوفاج مسجّل — أضف واحد.</p>}
      {list.map((h, i) => {
        const c = calc.radiators[i] || {}
        return (
          <div className="item-card" key={h.id}>
            <div className="item-head">
              <div>
                <strong>شوفاج {i + 1}</strong>
                <div className="mini">
                  Typ {h.typ} · {h.laenge} × {h.hoehe} mm
                </div>
              </div>
              <span className="preset-badge">Voreinst. {c.preset ?? '—'}</span>
              <button
                type="button"
                className="del"
                aria-label="حذف الشوفاج"
                onClick={() => set('hk', list.filter((x) => x.id !== h.id))}
              >
                ✕
              </button>
            </div>

            <Chips
              className="grid7"
              value={h.typ}
              onChange={(v) => upd(h.id, { typ: v })}
              options={HK_TYPES.map((t) => ({ value: t.k, label: t.k, sub: 'T' + t.k }))}
            />

            <div className="row2">
              <label className="field">
                <span className="field-label">الطول</span>
                <span className="field-sub">Baulänge</span>
                <span className="field-input">
                  <select value={h.laenge} onChange={(e) => upd(h.id, { laenge: e.target.value })}>
                    {HK_LAENGEN.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <span className="unit">mm</span>
                </span>
              </label>
              <label className="field">
                <span className="field-label">الارتفاع</span>
                <span className="field-sub">Bauhöhe</span>
                <span className="field-input">
                  <select value={h.hoehe} onChange={(e) => upd(h.id, { hoehe: e.target.value })}>
                    {HK_HOEHEN.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <span className="unit">mm</span>
                </span>
              </label>
            </div>

            <details className="more">
              <summary>الفالف والوصلة</summary>
              <label className="field">
                <span className="field-label">نوع الفالف</span>
                <span className="field-sub">Thermostatventil</span>
                <span className="field-input">
                  <select
                    value={h.ventilModell || 'projekt'}
                    onChange={(e) => upd(h.id, { ventilModell: e.target.value })}
                  >
                    <option value="projekt">
                      حسب إعدادات المشروع ({VALVES[project.valve]?.label || '—'})
                    </option>
                    {Object.entries(VALVES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <div className="row2">
                <label className="field">
                  <span className="field-label">نوع الوصلة</span>
                  <span className="field-sub">Anschluss</span>
                  <span className="field-input">
                    <select
                      value={h.anschuss || 'Eck'}
                      onChange={(e) => upd(h.id, { anschuss: e.target.value })}
                    >
                      {ANSCHLUESSE.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
                <Num
                  label="طول الوصلة"
                  sub="Zuleitung"
                  unit="m"
                  value={h.zuleitung}
                  onChange={(v) => upd(h.id, { zuleitung: v })}
                />
              </div>
            </details>

            <div className="hk-res">
              <span>
                Q <b>{fmt(c.qHk)}</b> W
              </span>
              <span>
                V̇ <b>{fmt(c.flowHk)}</b> l/h
              </span>
              <span>
                kv <b>{fmt(c.kvReq, 2)}</b>
              </span>
            </div>
          </div>
        )
      })}
      <button type="button" className="btn ghost sm" onClick={() => set('hk', [...list, newHk()])}>
        ＋ أضف شوفاج
      </button>
    </div>
  )
}

/* ---------- Blatt: Raum ---------- */

export default function RoomSheet({ draft, setDraft, project, isNew, onClose, onSave }) {
  const c = useMemo(() => calcRoom(draft, project), [draft, project])
  const wp = useMemo(() => wpCheckRoom(draft, project), [draft, project])
  const set = (k, v) => setDraft({ ...draft, [k]: v })
  const u = uValues(project)

  return (
    <div className="sheet">
      <header className="sheet-head">
        <button className="btn ghost" onClick={onClose}>
          إلغاء
        </button>
        <strong>{isNew ? 'غرفة جديدة' : 'تعديل الغرفة'}</strong>
        <button className="btn primary" onClick={onSave}>
          حفظ
        </button>
      </header>

      <div className="sheet-body">
        {/* 1 – Kamera */}
        <section className="card">
          <h2>
            <span className="num">١</span> صورة الغرفة
          </h2>
          <p className="hint">صوّر الغرفة والشوفاجات — الصورة بتنحفظ مع الغرفة وبتطلع بالتقرير.</p>
          <CameraField photo={draft.photo} onChange={(p) => set('photo', p)} />
        </section>

        {/* 2 – Raumtyp */}
        <section className="card">
          <h2>
            <span className="num">٢</span> شو نوع الغرفة؟
          </h2>
          <Chips
            className="grid3"
            value={draft.raumtyp}
            onChange={(v) => set('raumtyp', v)}
            options={ROOM_TYPES.map((r) => ({
              value: r.key,
              label: r.ar,
              sub: r.de + ' · ' + r.ti + '°C',
            }))}
          />
          <div className="row2">
            <label className="field">
              <span className="field-label">الطابق</span>
              <span className="field-input">
                <select value={draft.etage} onChange={(e) => set('etage', e.target.value)}>
                  {ETAGEN.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="field">
              <span className="field-label">اسم الغرفة (اختياري)</span>
              <span className="field-input">
                <input
                  type="text"
                  value={draft.bezeichnung}
                  placeholder={roomType(draft.raumtyp).de}
                  onChange={(e) => set('bezeichnung', e.target.value)}
                />
              </span>
            </label>
          </div>
        </section>

        {/* 3 – Maße */}
        <section className="card">
          <h2>
            <span className="num">٣</span> القياسات (Aufmaß)
          </h2>
          <div className="row2">
            <Num
              label="مساحة الأرضية"
              sub="Grundfläche"
              unit="m²"
              value={draft.flaeche}
              onChange={(v) => set('flaeche', v)}
            />
            <Num
              label="ارتفاع الغرفة"
              sub="Raumhöhe"
              unit="m"
              value={draft.hoehe}
              onChange={(v) => set('hoehe', v)}
            />
          </div>

          <h3 className="sub-h">الجدران الخارجية / للجوار</h3>
          <p className="hint small">طول كل جدار بالمتر — الطول × ارتفاع الغرفة = المساحة.</p>
          <Waende draft={draft} set={set} />

          <h3 className="sub-h">الشبابيك (Fenster)</h3>
          <Fenster draft={draft} set={set} />

          <details className="more" open={Boolean(draft.tueren?.length)}>
            <summary>أبواب خارجية (Außentüren)</summary>
            <Tueren draft={draft} set={set} />
          </details>

          <div className="row2">
            <label className="field">
              <span className="field-label">السقف</span>
              <span className="field-sub">Decke</span>
              <span className="field-input">
                <select value={draft.decke} onChange={(e) => set('decke', e.target.value)}>
                  {DECKE_TYPEN.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.ar}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="field">
              <span className="field-label">الأرضية</span>
              <span className="field-sub">Boden</span>
              <span className="field-input">
                <select value={draft.boden} onChange={(e) => set('boden', e.target.value)}>
                  {BODEN_TYPEN.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.ar}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>

          <details className="more" open={Boolean(Number(draft.dachLaenge))}>
            <summary>سقف مائل / علّية (Dachschräge)</summary>
            <div className="row3">
              <Num label="الطول" sub="Länge" unit="m" value={draft.dachLaenge} onChange={(v) => set('dachLaenge', v)} />
              <Num label="الارتفاع" sub="Höhe" unit="m" value={draft.dachHoehe} onChange={(v) => set('dachHoehe', v)} />
              <Num label="التحنية" sub="Drempel" unit="m" value={draft.drempel} onChange={(v) => set('drempel', v)} />
            </div>
          </details>

          <p className="hint small">
            U-قيم هذا المشروع: جدار {u.aw} · شبابيك {u.fensterAlt} · سقف مائل {u.dach} · سقف{' '}
            {u.decke} W/m²K
          </p>
        </section>

        {/* 4 – Heizkörper */}
        <section className="card">
          <h2>
            <span className="num">٤</span> الشوفاجات
          </h2>
          <p className="hint small">
            كل شوفاج لحاله — بيتحسب إله تدفقو وتعيينو. إذا الغرفة فيها شوفاجَين ضيف التاني.
          </p>
          <Heizkoerper draft={draft} set={set} project={project} calc={c} />
        </section>

        {/* Ergebnis */}
        <section className="card result">
          <h2>النتيجة</h2>

          <div className="preset-list">
            {c.radiators.length === 0 && <span>ما في شوفاج</span>}
            {c.radiators.map((r, i) => (
              <span key={r.id}>
                شوفاج {i + 1} → <b>{r.preset}</b>
              </span>
            ))}
          </div>

          <div className="big-result">
            <div>
              <span className="k">حاجة الغرفة</span>
              <strong>
                {fmt(c.qLoad)} <small>W</small>
              </strong>
              <span className="k small">Heizlast · {fmt(c.wm2)} W/m²</span>
            </div>
            <div>
              <span className="k">قدرة الشوفاجات</span>
              <strong>
                {fmt(c.qHk)} <small>W</small>
              </strong>
              <span className="k small">{fmt(c.cover * 100)}% من الحاجة</span>
            </div>
          </div>

          <div className="room-stats">
            <Stat k="التدفق الكلي" v={fmt(c.flow)} unit="l/h" />
            <Stat k="ΔT نظام" v={fmt(c.dTsys)} unit="K" />
            <Stat k="Δp فالف" v={fmt(c.dp)} unit="kPa" />
            <Stat k="حرارة" v={`${c.tv}/${c.tr}`} unit="°C" />
          </div>

          {c.radiators.some((r) => r.overCapacity) && (
            <p className="badge warn">
              ⚠ التدفق أكبر من قدرة الفالف على آخر درجة — ارفع Δp (مثلاً ١٥–٢٠ kPa) أو
              استعمل فالف أكبر.
            </p>
          )}

          <h3 className="sub-h">فحص المضخة الحرارية (Heizflächenauslegung)</h3>
          <p className="hint small">
            قدّيش بتغطي الشوفاجات الحالية إذا نزّلنا حرارة النظام؟ ١٠٠٪ = مناسب للمضخة.
          </p>
          <WpBars items={wp} />

          {c.status === 'low' && (
            <p className="badge warn">
              ⚠ الشوفاج صغير — عم يغطي {fmt(c.cover * 100)}% من حاجة الغرفة
            </p>
          )}
          {c.status === 'high' && (
            <p className="badge ok">
              ✓ الشوفاج أكبر من الحاجة ({fmt(c.cover * 100)}%) — الضبط رح ينظّم التدفق
            </p>
          )}
          {c.status === 'ok' && <p className="badge ok">✓ الحجم مناسب ({fmt(c.cover * 100)}%)</p>}
          {c.status === 'empty' && <p className="badge">ناقص قياسات — عيّن المساحة والجدران</p>}
          {c.status === 'nohk' && <p className="badge warn">⚠ ما في قياسات للشوفاج</p>}

          <details className="more">
            <summary>تفاصيل الحساب</summary>
            <table className="calc">
              <tbody>
                {c.parts
                  .filter((p) => p.A > 0 && p.f > 0)
                  .map((p) => (
                    <tr key={p.key}>
                      <td>{p.de}</td>
                      <td>{fmt(p.A, 2)} m²</td>
                      <td>
                        U {fmt(p.U, 2)} · f {fmt(p.f, 1)}
                      </td>
                      <td>{fmt(p.q)} W</td>
                    </tr>
                  ))}
                <tr>
                  <td>Lüftung</td>
                  <td>{fmt(c.volume, 1)} m³</td>
                  <td>0,5 1/h</td>
                  <td>{fmt(c.qVent)} W</td>
                </tr>
                <tr className="sum">
                  <td colSpan="3">Wärmebedarf ({c.dT} K)</td>
                  <td>{fmt(c.qLoad)} W</td>
                </tr>
              </tbody>
            </table>
            <p className="hint small">
              V̇ = Q / (1,163 · ΔT) = {fmt(c.qLoad)} / (1,163 · {c.dTsys}) = {fmt(c.flow, 0)} l/h
              {' · '}V̇ je Heizkörper anteilig nach Nennleistung · kv = V̇/√Δp
            </p>
          </details>
        </section>
      </div>

      <footer className="sheet-foot">
        <div className="foot-num">
          <span>Heizlast</span>
          <strong>{fmt(c.qLoad)} W</strong>
        </div>
        <div className="foot-num">
          <span>التدفق</span>
          <strong>{fmt(c.flow)} l/h</strong>
        </div>
        <button className="btn primary" onClick={onSave}>
          حفظ الغرفة
        </button>
      </footer>
    </div>
  )
}
