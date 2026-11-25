import { useEffect, useMemo, useRef, useState } from 'react'
import './styles.css'
import { BAUALTER, VALVES } from './data.js'
import { sumProject, uValues, wpCheckProject, roomType } from './calc.js'
import { KEY, loadState, newProject, newRoom } from './model.js'
import { roomsFromScan } from './scanImport.js'
import RoomSheet from './RoomSheet.jsx'
import Report from './Report.jsx'
import { fmt, Stat, Num, WpBars } from './ui.jsx'

/* ---------- Raumkarte ---------- */

function RoomCard({ room, c, onOpen, onDelete }) {
  const rt = roomType(room.raumtyp)
  const name = (room.bezeichnung || '').trim() || rt.ar
  const presets = c.radiators.filter((r) => r.preset && r.preset !== '—')

  return (
    <article className="room" onClick={onOpen}>
      <div className="room-head">
        {room.photo ? (
          <img className="thumb" src={room.photo} alt="صورة الغرفة" />
        ) : (
          <div className="thumb empty">🏠</div>
        )}
        <div className="room-title">
          <span className="etage">{room.etage}</span>
          <h3>{name}</h3>
          <p>
            {rt.de} · {fmt(room.flaeche, 1)} m² · {c.radiators.length} شوفاج ·{' '}
            {c.qLoad > 0 ? fmt(c.wm2) + ' W/m²' : 'ناقص قياسات'}
          </p>
        </div>
        <button
          className="del"
          aria-label="حذف الغرفة"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          ✕
        </button>
      </div>

      <div className="room-stats">
        <Stat
          k={presets.length > 1 ? 'التعيينات' : 'Voreinstellung'}
          v={presets.length ? presets.map((p) => p.preset).join(' · ') : '—'}
          tone="accent"
        />
        <Stat k="V̇ الكلي" v={fmt(c.flow)} unit="l/h" />
        <Stat k="Bedarf" v={fmt(c.qLoad)} unit="W" />
        <Stat k="Heizkörper" v={fmt(c.qHk)} unit="W" />
      </div>

      {c.status === 'low' && (
        <p className="badge warn">⚠ الشوفاج صغير — عم يغطي {fmt(c.cover * 100)}% من حاجة الغرفة</p>
      )}
      {c.status === 'high' && (
        <p className="badge ok">
          ✓ الشوفاج أكبر من الحاجة ({fmt(c.cover * 100)}%) — الضبط رح ينظّم التدفق
        </p>
      )}
      {c.status === 'ok' && <p className="badge ok">✓ الحجم مناسب ({fmt(c.cover * 100)}%)</p>}
      {c.status === 'empty' && <p className="badge">ناقص قياسات — عيّن المساحة والجدران</p>}
      {c.status === 'nohk' && <p className="badge warn">⚠ ما في قياسات للشوفاج</p>}
    </article>
  )
}

/* ---------- Blatt: Einstellungen ---------- */

function SettingsSheet({ project, update, onClose }) {
  const set = (k, v) => update({ [k]: v })
  return (
    <div className="sheet">
      <header className="sheet-head">
        <button className="btn ghost" onClick={onClose}>
          إغلاق
        </button>
        <strong>إعدادات المشروع</strong>
        <span style={{ width: 64 }} />
      </header>
      <div className="sheet-body">
        <section className="card">
          <h2>المشروع والعميل</h2>
          <label className="field">
            <span className="field-label">اسم المشروع</span>
            <span className="field-sub">Projekt</span>
            <span className="field-input">
              <input
                type="text"
                value={project.name}
                placeholder="z.B. Haus Meier"
                onChange={(e) => set('name', e.target.value)}
              />
            </span>
          </label>
          <label className="field">
            <span className="field-label">العميل</span>
            <span className="field-sub">Kunde</span>
            <span className="field-input">
              <input
                type="text"
                value={project.kunde}
                placeholder="Name / Objekt"
                onChange={(e) => set('kunde', e.target.value)}
              />
            </span>
          </label>
          <label className="field">
            <span className="field-label">العنوان</span>
            <span className="field-sub">Adresse</span>
            <span className="field-input">
              <input
                type="text"
                value={project.adresse}
                placeholder="Straße, Ort"
                onChange={(e) => set('adresse', e.target.value)}
              />
            </span>
          </label>
          <label className="field">
            <span className="field-label">التاريخ</span>
            <span className="field-sub">Datum</span>
            <span className="field-input">
              <input type="date" value={project.datum} onChange={(e) => set('datum', e.target.value)} />
            </span>
          </label>
        </section>

        <section className="card">
          <h2>البناء والعزل</h2>
          <label className="field">
            <span className="field-label">سنة البناء</span>
            <span className="field-sub">Baujahr → U-Werte</span>
            <span className="field-input">
              <select value={project.baujahr} onChange={(e) => set('baujahr', e.target.value)}>
                {BAUALTER.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.de}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <div className="row2">
            <label className="switch">
              <input
                type="checkbox"
                checked={project.fensterSaniert}
                onChange={(e) => set('fensterSaniert', e.target.checked)}
              />
              <span>شبابيك مجدّدة</span>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={project.dachSaniert}
                onChange={(e) => set('dachSaniert', e.target.checked)}
              />
              <span>سقف معزول</span>
            </label>
          </div>
        </section>

        <section className="card">
          <h2>حرارة النظام</h2>
          <div className="row3">
            <Num label="رايح" sub="Vorlauf" unit="°C" value={project.tv} onChange={(v) => set('tv', v)} />
            <Num label="راجع" sub="Rücklauf" unit="°C" value={project.tr} onChange={(v) => set('tr', v)} />
            <Num label="خارجي" sub="Norm-Außentemp." unit="°C" value={project.te} onChange={(v) => set('te', v)} />
          </div>
          <p className="hint small">
            فرق الحرارة {fmt(Number(project.tv) - Number(project.tr))} K — كل ما زاد الفرق قلّ التدفق.
          </p>
        </section>

        <section className="card">
          <h2>الفالف والضغط</h2>
          <label className="field">
            <span className="field-label">نوع الفالف الافتراضي</span>
            <span className="field-sub">Thermostatventil</span>
            <span className="field-input">
              <select value={project.valve} onChange={(e) => set('valve', e.target.value)}>
                {Object.entries(VALVES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <Num
            label="فرق الضغط على الفالف"
            sub="Δp Ventil"
            unit="kPa"
            value={project.dp}
            onChange={(v) => set('dp', v)}
          />
          <p className="hint small">
            الافتراضي ١٠ كيلوباسكال. مضخة عالية → خفّض، شبكة طويلة → ارفع.
          </p>
        </section>
      </div>
    </div>
  )
}

/* ---------- Blatt: Projekte ---------- */

function ProjectsSheet({ state, setState, onClose, notify }) {
  const fileRef = useRef(null)
  const [name, setName] = useState('')

  const add = () => {
    const p = newProject(name.trim() || 'مشروع جديد')
    setState({ ...state, activeId: p.id, projects: [...state.projects, p] })
    setName('')
  }

  const remove = (id) => {
    if (!confirm('حذف المشروع وكل غرفه؟')) return
    const rest = state.projects.filter((p) => p.id !== id)
    if (rest.length === 0) {
      const fresh = newProject('مشروع جديد')
      setState({ activeId: fresh.id, projects: [fresh] })
      return
    }
    setState({ ...state, projects: rest, activeId: state.activeId === id ? rest[0].id : state.activeId })
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `saam-scan-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }

  const importJson = (ev) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (!data || !Array.isArray(data.projects) || !data.projects.length) throw new Error('format')
        const projects = data.projects
        const activeId = projects.some((p) => p.id === data.activeId) ? data.activeId : projects[0].id
        setState({ activeId, projects })
        onClose()
        notify('تم استيراد النسخة ✓')
      } catch {
        notify('الملف مو نسخة صحيحة')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="sheet">
      <header className="sheet-head">
        <button className="btn ghost" onClick={onClose}>
          إغلاق
        </button>
        <strong>المشاريع</strong>
        <span style={{ width: 64 }} />
      </header>
      <div className="sheet-body">
        <section className="card">
          <h2>كل المشاريع</h2>
          {state.projects.map((p) => {
            const t = sumProject(p)
            return (
              <div
                key={p.id}
                className={'proj-row' + (p.id === state.activeId ? ' on' : '')}
                onClick={() => {
                  setState({ ...state, activeId: p.id })
                  onClose()
                }}
              >
                <div className="pr-main">
                  <strong>{p.name || 'بدون اسم'}</strong>
                  <div className="mini">
                    {p.rooms.length} غرف · {fmt(t.qLoad)} W · {p.datum}
                  </div>
                </div>
                <button
                  className="del"
                  aria-label="حذف المشروع"
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(p.id)
                  }}
                >
                  ✕
                </button>
              </div>
            )
          })}

          <div className="row2" style={{ marginTop: 10 }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">مشروع جديد</span>
              <span className="field-input">
                <input
                  type="text"
                  value={name}
                  placeholder="اسم المشروع"
                  onChange={(e) => setName(e.target.value)}
                />
              </span>
            </label>
            <button className="btn primary" onClick={add} style={{ alignSelf: 'flex-end' }}>
              ＋
            </button>
          </div>
        </section>

        <section className="card">
          <h2>النسخ الاحتياطي</h2>
          <p className="hint small">
            كل البيانات على التليفون. صدّر ملف JSON للنسخة، وارجعه إذا بدّلت الجهاز.
          </p>
          <div className="row2">
            <button className="btn ghost sm" onClick={exportJson}>
              تصدير نسخة
            </button>
            <label className="btn ghost sm">
              استيراد نسخة
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
            </label>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ---------- App ---------- */

export default function App() {
  const [state, setState] = useState(loadState)
  const [draft, setDraft] = useState(null)
  const [settings, setSettings] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [toast, setToast] = useState('')
  const scanInput = useRef(null)

  const project = state.projects.find((p) => p.id === state.activeId) || state.projects[0]

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      setToast('الذاكرة ممتلئة — جرّب تشيل صور قديمة')
    }
  }, [state])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const update = (patch) => {
    if (!project) return
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === project.id ? { ...p, ...patch } : p)),
    }))
  }

  const { rows, qLoad, qHk, flow } = useMemo(() => sumProject(project), [project])
  const totals = { qLoad, qHk, flow }
  const wp = useMemo(() => wpCheckProject(project), [project])
  const u = uValues(project)

  if (!project) return null

  const isNew = draft ? !project.rooms.some((r) => r.id === draft.id) : false

  function openNew() {
    setDraft(newRoom(project.rooms.at(-1)?.etage || 'EG'))
  }

  function saveDraft() {
    if (!draft) return
    const exists = project.rooms.some((r) => r.id === draft.id)
    update({
      rooms: exists ? project.rooms.map((r) => (r.id === draft.id ? draft : r)) : [...project.rooms, draft],
    })
    setDraft(null)
    setToast('انحفظت الغرفة ✓')
  }

  function removeRoom(id) {
    if (!confirm('حذف الغرفة؟')) return
    update({ rooms: project.rooms.filter((r) => r.id !== id) })
  }

  function importScan(ev) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const rooms = roomsFromScan(JSON.parse(String(reader.result)))
        if (!rooms.length) throw new Error('empty')
        update({ rooms: [...project.rooms, ...rooms] })
        setToast(`انضافت ${rooms.length} غرفة من المسح ✓`)
      } catch {
        setToast('ملف المسح مو صحيح')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div className="app">
        <header className="top">
          <div className="brand">
            <span className="logo">S</span>
            <div>
              <h1>SAAM Scan</h1>
              <p>Heizlast · Abgleich</p>
            </div>
          </div>
          <div className="top-actions">
            <button className="icon-btn" onClick={() => setProjectsOpen(true)} aria-label="المشاريع">
              🗂
            </button>
            <button className="icon-btn" onClick={() => setSettings(true)} aria-label="إعدادات">
              ⚙
            </button>
          </div>
        </header>

        <main>
          <section className="card summary">
            <div className="project-bar">
              <div className="pb-name">
                <span className="k">المشروع</span>
                <strong>{project.name || 'بدون اسم'}</strong>
              </div>
              <button className="btn ghost" onClick={() => setProjectsOpen(true)}>
                تبديل
              </button>
            </div>

            <div className="summary-top">
              <div>
                <span className="k">العميل</span>
                <strong>{project.kunde || 'بدون اسم'}</strong>
              </div>
              <div>
                <span className="k">التاريخ</span>
                <strong>{project.datum}</strong>
              </div>
            </div>

            <div className="room-stats four">
              <Stat k="عدد الغرف" v={project.rooms.length} />
              <Stat k="إجمالي الحاجة" v={fmt(qLoad)} unit="W" />
              <Stat k="إجمالي التدفق" v={fmt(flow)} unit="l/h" />
              <Stat k="النظام" v={`${project.tv}/${project.tr}`} unit="°C" />
            </div>

            {qLoad > 0 && (
              <>
                <p className="hint small" style={{ marginTop: 12 }}>
                  فحص المضخة الحرارية — تغطية الشوفاجات للحاجة:
                </p>
                <WpBars items={wp} />
              </>
            )}

            <p className="hint small">
              {u.aw} W/m²K جدار · {u.fensterAlt} شبابيك · {u.dach} سقف · Δp {project.dp} kPa
            </p>
          </section>

          {project.rooms.length === 0 ? (
            <div className="empty-state">
              <span>📷</span>
              <h2>ما في غرف بعد</h2>
              <p>
                امشِ بالبيت غرفة غرفة: صوّر، سجّل الجدران والشبابيك، وكل شوفاج بقياسو — والبرنامج
                بيحسب الهيزلَاست والتعيين.
              </p>
              <button className="btn primary wide" onClick={openNew}>
                + أضف أول غرفة
              </button>
            </div>
          ) : (
            <div className="rooms">
              {rows.map(({ room, c }) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  c={c}
                  onOpen={() => setDraft({ ...room })}
                  onDelete={() => removeRoom(room.id)}
                />
              ))}
            </div>
          )}
        </main>

        <div className="bottombar">
          <div className="bb-info">
            <span>
              {project.rooms.length} غرف · {fmt(qHk)} W شوفاجات
            </span>
            <strong>{fmt(flow)} l/h</strong>
          </div>
          <input
            ref={scanInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={importScan}
          />
          <button
            className="btn ghost"
            onClick={() => scanInput.current?.click()}
            aria-label="استيراد مسح"
            title="استيراد مسح (JSON)"
          >
            📥
          </button>
          <button className="btn ghost" onClick={() => window.print()} aria-label="تقرير PDF">
            🖨
          </button>
          <button className="btn primary" onClick={openNew}>
            + غرفة
          </button>
        </div>

        {draft && (
          <RoomSheet
            draft={draft}
            setDraft={setDraft}
            project={project}
            isNew={isNew}
            onClose={() => setDraft(null)}
            onSave={saveDraft}
          />
        )}
        {settings && (
          <SettingsSheet project={project} update={update} onClose={() => setSettings(false)} />
        )}
        {projectsOpen && (
          <ProjectsSheet
            state={state}
            setState={setState}
            onClose={() => setProjectsOpen(false)}
            notify={setToast}
          />
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>

      <Report project={project} rows={rows} totals={totals} />
    </>
  )
}
