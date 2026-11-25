import {
  BAUALTER,
  ROOM_TYPES,
  HK_TYPES,
  VALVES,
  WAND_TYPEN,
  FENSTER_TYPEN,
  DECKE_TYPEN,
  BODEN_TYPEN,
} from './data.js'

const N_AIR = 0.5 // Luftwechselrate (vereinfachtes Ersatzverfahren)
const N_HK = 1.3 // Heizkörper-Exponent
const C_W = 1.163 // Wh/(kg·K)
const U_TUER = 1.8 // Außentür
const F_UNBEHEIZT = 0.5

export const WP_VARIANTEN = [
  { key: 'wp5545', tv: 55, tr: 45, label: '55/45' },
  { key: 'wp4535', tv: 45, tr: 35, label: '45/35' },
]

const n = (v, fallback = 0) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : fallback
}

/** Nennleistung eines Heizkörpers bei 75/65/20 °C in Watt. */
export function hkNominal(typ, laengeMm, hoeheMm) {
  const base = n(HK_TYPES.find((t) => t.k === String(typ))?.w)
  const l = n(laengeMm)
  const h = n(hoeheMm, 600) || 600
  if (!base || !l) return 0
  return base * (l / 1000) * Math.pow(h / 600, 0.86)
}

/** Leistung eines Heizkörpers bei beliebiger mittlerer Übertemperatur. */
export function hkPower(typ, laengeMm, hoeheMm, dtm) {
  const qn = hkNominal(typ, laengeMm, hoeheMm)
  return qn > 0 && dtm > 0 ? qn * Math.pow(dtm / 50, N_HK) : 0
}

export function roomType(key) {
  return ROOM_TYPES.find((r) => r.key === key) || ROOM_TYPES[0]
}

export function uValues(project) {
  const base = BAUALTER.find((b) => b.key === project?.baujahr) || BAUALTER[2]
  return {
    aw: base.aw,
    dach: project?.dachSaniert ? 0.24 : base.dach,
    decke: project?.dachSaniert ? 0.24 : base.decke,
    boden: base.boden,
    fensterAlt: project?.fensterSaniert ? 1.3 : base.fenster,
  }
}

function fensterU(typ, u) {
  if (!typ || typ === 'alt') return u.fensterAlt
  return FENSTER_TYPEN.find((f) => f.key === typ)?.u ?? u.fensterAlt
}

/** Wärmebedarf des Raums: Transmission (Hüllflächen) + Lüftung. */
export function roomLoad(room, project) {
  const u = uValues(project)
  const rt = roomType(room.raumtyp)
  const ti = rt.ti
  const teRaw = Number(project?.te)
  const te = Number.isFinite(teRaw) ? teRaw : -12
  const dT = Math.max(0, ti - te)
  const hoehe = n(room.hoehe, 2.5) || 2.5
  const flaeche = n(room.flaeche)

  const waende = (room.waende || []).map((w) => {
    const t = WAND_TYPEN.find((x) => x.key === w.typ) || WAND_TYPEN[0]
    return {
      id: w.id,
      laenge: n(w.laenge),
      typ: t.key,
      A: n(w.laenge) * hoehe,
      U: u.aw,
      f: t.f,
    }
  })

  const fenster = (room.fenster || []).map((f) => {
    const anzahl = Math.max(1, Math.round(n(f.anzahl, 1)))
    const A = n(f.breite) * n(f.hoehe) * anzahl
    return { ...f, anzahl, A, U: fensterU(f.typ, u), f: 1 }
  })

  const tueren = (room.tueren || []).map((t) => {
    const anzahl = Math.max(1, Math.round(n(t.anzahl, 1)))
    const A = n(t.breite) * n(t.hoehe) * anzahl
    return { ...t, anzahl, A, U: U_TUER, f: 1 }
  })

  const aAussenBrutto = waende.filter((w) => w.typ === 'aussen').reduce((s, w) => s + w.A, 0)
  const aUnbeheizt = waende.filter((w) => w.typ === 'unbeheizt').reduce((s, w) => s + w.A, 0)
  const aFenster = fenster.reduce((s, f) => s + f.A, 0)
  const aTueren = tueren.reduce((s, t) => s + t.A, 0)
  const aAussenNetto = Math.max(0, aAussenBrutto - aFenster - aTueren)
  const fensterUmittel = aFenster > 0 ? fenster.reduce((s, f) => s + f.A * f.U, 0) / aFenster : 0

  const dachLaenge = n(room.dachLaenge)
  const dachHoehe = n(room.dachHoehe)
  const drempel = n(room.drempel)
  const aDach = dachLaenge * Math.max(0, dachHoehe - drempel)
  const aDrempel = dachLaenge * drempel

  const decke = DECKE_TYPEN.find((d) => d.key === room.decke) || DECKE_TYPEN[0]
  const boden = BODEN_TYPEN.find((d) => d.key === room.boden) || BODEN_TYPEN[0]

  const parts = [
    { key: 'aw', de: 'Außenwand', ar: 'جدار خارجي', A: aAussenNetto, U: u.aw, f: 1 },
    { key: 'fenster', de: 'Fenster', ar: 'شبابيك', A: aFenster, U: fensterUmittel || u.fensterAlt, f: 1 },
    { key: 'tuer', de: 'Außentür', ar: 'باب خارجي', A: aTueren, U: U_TUER, f: 1 },
    { key: 'unbeheizt', de: 'Wand zu unbeheizt', ar: 'جدار لجوار غير مدفأ', A: aUnbeheizt, U: u.aw, f: F_UNBEHEIZT },
    { key: 'dach', de: 'Dachschräge', ar: 'سقف مائل', A: aDach, U: u.dach, f: 1 },
    { key: 'drempel', de: 'Drempel', ar: 'جدار التحنية', A: aDrempel, U: u.aw, f: 1 },
    { key: 'decke', de: 'Decke (' + decke.de + ')', ar: 'السقف', A: flaeche, U: u.decke, f: decke.f },
    { key: 'boden', de: 'Boden (' + boden.de + ')', ar: 'الأرضية', A: flaeche, U: u.boden, f: boden.f },
  ].map((p) => ({ ...p, q: p.A * p.U * p.f * dT }))

  const volume = flaeche * hoehe
  const qVent = 0.34 * N_AIR * volume * dT
  const qTrans = parts.reduce((s, p) => s + p.q, 0)

  return {
    ti,
    te,
    dT,
    flaeche,
    hoehe,
    volume,
    parts,
    qTrans,
    qVent,
    total: qTrans + qVent,
    aAussenNetto,
    aFenster,
    aTueren,
    decke,
    boden,
  }
}

/** Volumenströme, kv-Werte und Voreinstellung je Heizkörper. */
export function calcRoom(room, project) {
  const load = roomLoad(room, project)
  const tv = n(project?.tv, 75) || 75
  const tr = n(project?.tr, 65) || 65
  const dTsys = Math.max(1, tv - tr)
  const dtm = (tv + tr) / 2 - load.ti
  const dp = n(project?.dp, 10) || 10
  const flow = load.total > 0 ? load.total / (C_W * dTsys) : 0

  const hks = (room.hk || []).map((h) => {
    const qn = hkNominal(h.typ, h.laenge, h.hoehe)
    const qHk = qn > 0 && dtm > 0 ? qn * Math.pow(dtm / 50, N_HK) : 0
    return { ...h, qn, qHk }
  })
  const sumQn = hks.reduce((s, h) => s + h.qn, 0)
  const nAktiv = hks.filter((h) => h.qn > 0).length

  const radiators = hks.map((h) => {
    const share = sumQn > 0 ? h.qn / sumQn : nAktiv > 0 ? 1 / nAktiv : 0
    const flowHk = flow * share
    const kvReq = flowHk > 0 ? flowHk / 1000 / Math.sqrt(dp / 100) : 0
    const valveKey = h.ventilModell && h.ventilModell !== 'projekt' ? h.ventilModell : project?.valve
    const valve = VALVES[valveKey] || VALVES.danfoss_ran
    let preset = '—'
    let presetKv = 0
    if (valve.steps.length && kvReq > 0) {
      const hit = valve.steps.find((s) => s.kv >= kvReq) || valve.steps[valve.steps.length - 1]
      preset = hit.s
      presetKv = hit.kv
    }
    const maxKv = valve.steps.length ? valve.steps[valve.steps.length - 1].kv : 0
    return {
      ...h,
      flowHk,
      kvReq,
      preset,
      presetKv,
      maxKv,
      overCapacity: maxKv > 0 && kvReq > maxKv,
      valveLabel: valve.label,
      share,
    }
  })

  const qHk = hks.reduce((s, h) => s + h.qHk, 0)
  const cover = load.total > 0 && qHk > 0 ? qHk / load.total : 0
  const wm2 = load.flaeche > 0 ? load.total / load.flaeche : 0

  let status = 'empty'
  if (load.total > 0) {
    if (!qHk) status = 'nohk'
    else if (cover < 0.9) status = 'low'
    else if (cover > 1.8) status = 'high'
    else status = 'ok'
  }

  return {
    ...load,
    radiators,
    qLoad: load.total,
    qHk,
    cover,
    flow,
    wm2,
    dtm,
    tv,
    tr,
    dTsys,
    dp,
    status,
  }
}

/** Heizflächenauslegung: reicht der Heizkörper bei niedriger Vorlauftemperatur? */
export function wpCheckRoom(room, project) {
  const load = roomLoad(room, project)
  const qn = (room.hk || []).reduce((s, h) => s + hkNominal(h.typ, h.laenge, h.hoehe), 0)
  return WP_VARIANTEN.map((v) => {
    const dtm = (v.tv + v.tr) / 2 - load.ti
    const q = qn > 0 && dtm > 0 ? qn * Math.pow(dtm / 50, N_HK) : 0
    return { ...v, q, load: load.total, cover: load.total > 0 ? q / load.total : 0 }
  })
}

export function wpCheckProject(project) {
  const rooms = project?.rooms || []
  return WP_VARIANTEN.map((v, i) => {
    let q = 0
    let load = 0
    rooms.forEach((r) => {
      const c = wpCheckRoom(r, project)[i]
      q += c.q
      load += c.load
    })
    return { ...v, q, load, cover: load > 0 ? q / load : 0 }
  })
}

export function sumProject(project) {
  const rows = (project?.rooms || []).map((room) => ({ room, c: calcRoom(room, project) }))
  const qLoad = rows.reduce((s, x) => s + x.c.qLoad, 0)
  const qHk = rows.reduce((s, x) => s + x.c.qHk, 0)
  const flow = rows.reduce((s, x) => s + x.c.flow, 0)
  return { rows, qLoad, qHk, flow }
}
