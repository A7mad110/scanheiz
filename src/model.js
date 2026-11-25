import { uid } from './ui.jsx'

export const KEY = 'saam-scan-v2'
const OLD_KEY = 'saam-abgleich-v1'

export function newHk() {
  return {
    id: uid(),
    typ: '22',
    laenge: '1200',
    hoehe: '600',
    anschuss: 'Eck',
    ventilModell: 'projekt',
    zuleitung: '',
  }
}

export function newRoom(etage = 'EG') {
  return {
    id: uid(),
    etage,
    raumtyp: 'wohnen',
    bezeichnung: '',
    photo: '',
    flaeche: '',
    hoehe: '2.5',
    waende: [{ id: uid(), laenge: '', typ: 'aussen' }],
    fenster: [],
    tueren: [],
    decke: etage === 'DG' ? 'dachboden' : 'beheizt',
    boden: etage === 'KG' || etage === 'EG' ? 'erdreich' : 'beheizt',
    dachLaenge: '',
    dachHoehe: '',
    drempel: '',
    hk: [newHk()],
  }
}

export function newProject(name = 'مشروع جديد') {
  return {
    id: uid(),
    name,
    kunde: '',
    adresse: '',
    datum: new Date().toISOString().slice(0, 10),
    baujahr: '1969_1978',
    fensterSaniert: false,
    dachSaniert: false,
    tv: 75,
    tr: 65,
    te: -12,
    dp: 10,
    valve: 'danfoss_ran',
    rooms: [],
  }
}

/** Alte Räume (v1: eine Wand, Fensterfläche, ein Heizkörper) übernehmen. */
export function normalizeRoom(r) {
  if (Array.isArray(r.waende) && Array.isArray(r.hk) && Array.isArray(r.fenster)) return { ...r }

  const hoehe = r.hoehe ?? '2.5'
  const etage = r.etage || 'EG'

  const waende = Array.isArray(r.waende)
    ? r.waende
    : Number(r.awLaenge) > 0
      ? [{ id: uid(), laenge: String(r.awLaenge), typ: 'aussen' }]
      : []

  const fenster = Array.isArray(r.fenster)
    ? r.fenster
    : Number(r.fenster) > 0
      ? [
          {
            id: uid(),
            breite: '1.2',
            hoehe: '1.4',
            anzahl: String(Math.max(1, Math.round(Number(r.fenster) / 1.68))),
            typ: 'alt',
          },
        ]
      : []

  const anzahl = Math.max(1, Math.round(Number(r.anzahl) || 1))
  const single = {
    typ: r.typ || '22',
    laenge: r.hkLaenge || '1200',
    hoehe: r.hkHoehe || '600',
    anschuss: r.ventil || 'Eck',
    ventilModell: 'projekt',
    zuleitung: r.zuleitung || '',
  }
  const hk = Array.isArray(r.hk)
    ? r.hk
    : Array.from({ length: anzahl }, () => ({ id: uid(), ...single }))

  return {
    ...newRoom(etage),
    ...r,
    hoehe,
    waende,
    fenster,
    tueren: Array.isArray(r.tueren) ? r.tueren : [],
    decke: r.decke || (etage === 'DG' ? 'dachboden' : 'beheizt'),
    boden: r.boden || (etage === 'KG' || etage === 'EG' ? 'erdreich' : 'beheizt'),
    hk,
  }
}

export function normalizeProject(p) {
  const base = newProject(p.name || 'مشروع')
  return {
    ...base,
    ...p,
    rooms: Array.isArray(p.rooms) ? p.rooms.map(normalizeRoom) : [],
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.projects) && parsed.projects.length) {
        const projects = parsed.projects.map(normalizeProject)
        const activeId = projects.some((p) => p.id === parsed.activeId)
          ? parsed.activeId
          : projects[0].id
        return { activeId, projects }
      }
    }
  } catch {
    /* kaputte Daten ignorieren */
  }

  try {
    const old = localStorage.getItem(OLD_KEY)
    if (old) {
      const p = JSON.parse(old)
      const project = normalizeProject({
        ...p,
        id: uid(),
        name: p.kunde || 'مشروعي',
        rooms: Array.isArray(p.rooms) ? p.rooms : [],
      })
      return { activeId: project.id, projects: [project] }
    }
  } catch {
    /* alte Daten ignorieren */
  }

  const project = newProject('مشروعي')
  return { activeId: project.id, projects: [project] }
}
