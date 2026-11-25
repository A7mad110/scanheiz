import { uid } from './ui.jsx'
import { newHk } from './model.js'

const s = (v, fallback = '') => (v === 0 || v ? String(v) : fallback)

function windows(list) {
  return (list || []).map((f) => ({
    id: uid(),
    breite: s(f.breite ?? f.width),
    hoehe: s(f.hoehe ?? f.height),
    anzahl: s(f.anzahl ?? f.count, '1'),
    typ: f.typ || 'alt',
  }))
}

/** Liest den Export von ScanHeiz (iOS) und macht daraus Raum-Entwürfe. */
export function roomsFromScan(json) {
  const source = Array.isArray(json) ? json : json?.rooms
  if (!Array.isArray(source)) throw new Error('format')

  return source.map((r) => ({
    id: uid(),
    etage: r.etage || 'EG',
    raumtyp: r.raumtyp || 'wohnen',
    bezeichnung: r.name || r.bezeichnung || '',
    photo: '',
    flaeche: s(r.flaeche ?? r.area),
    hoehe: s(r.hoehe ?? r.height, '2.5'),
    waende: (r.waende || r.walls || []).map((w) => ({
      id: uid(),
      laenge: s(w.laenge ?? w.length),
      typ: ['aussen', 'unbeheizt', 'beheizt'].includes(w.typ) ? w.typ : 'aussen',
    })),
    fenster: windows(r.fenster || r.windows),
    tueren: windows(r.tueren || r.doors),
    decke: r.decke || 'beheizt',
    boden: r.boden || 'erdreich',
    dachLaenge: '',
    dachHoehe: '',
    drempel: '',
    hk: [newHk()],
  }))
}
