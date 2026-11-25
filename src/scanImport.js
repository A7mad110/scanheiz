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

/**
 * Heizkörper aus dem Scan übernehmen. LiDAR erkennt sie nicht — die App fragt
 * Bauart/Höhe/Länge nach dem Scannen ab. Fehlt alles, bleibt ein Standard-Eintrag.
 */
function radiators(list) {
  const mapped = (list || []).map((h) => {
    const anzahl = Math.max(1, Math.round(Number(h.anzahl ?? h.count) || 1))
    return Array.from({ length: anzahl }, () => ({
      id: uid(),
      typ: String(h.typ ?? '22'),
      laenge: s(h.laenge ?? h.length, '1200'),
      hoehe: s(h.hoehe ?? h.height, '600'),
      anschuss: 'Eck',
      ventilModell: 'projekt',
      zuleitung: '',
    }))
  })
  const flat = mapped.flat()
  return flat.length ? flat : [newHk()]
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
    hk: radiators(r.radiators ?? r.hk),
  }))
}
