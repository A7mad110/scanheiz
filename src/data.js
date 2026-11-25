// Referenzdaten für Heizlast + hydraulischen Abgleich.
// Alle Leistungsangaben sind Orientierungswerte (Flachheizkörper, 75/65/20 °C).

// U-Werte nach Baualter (W/m²K) – Außenwand, Fenster (Bestand), Dachschräge,
// Decke gegen unbeheizt, Boden gegen Erdreich/Keller.
export const BAUALTER = [
  { key: 'bis1958', de: 'bis 1958', ar: 'قبل ١٩٥٨', aw: 1.5, fenster: 3.0, dach: 1.2, decke: 1.4, boden: 1.2 },
  { key: '1959_1968', de: '1959–1968', ar: '١٩٥٩–١٩٦٨', aw: 1.3, fenster: 2.9, dach: 1.0, decke: 1.2, boden: 1.0 },
  { key: '1969_1978', de: '1969–1978', ar: '١٩٦٩–١٩٧٨', aw: 1.1, fenster: 2.7, dach: 0.8, decke: 1.0, boden: 0.9 },
  { key: '1979_1983', de: '1979–1983', ar: '١٩٧٩–١٩٨٣', aw: 0.9, fenster: 2.4, dach: 0.6, decke: 0.7, boden: 0.7 },
  { key: '1984_1994', de: '1984–1994', ar: '١٩٨٤–١٩٩٤', aw: 0.6, fenster: 1.8, dach: 0.45, decke: 0.5, boden: 0.55 },
  { key: '1995_2001', de: '1995–2001', ar: '١٩٩٥–٢٠٠١', aw: 0.45, fenster: 1.5, dach: 0.35, decke: 0.4, boden: 0.45 },
  { key: '2002_2009', de: '2002–2009', ar: '٢٠٠٢–٢٠٠٩', aw: 0.35, fenster: 1.3, dach: 0.3, decke: 0.3, boden: 0.35 },
  { key: '2010_2015', de: '2010–2015', ar: '٢٠١٠–٢٠١٥', aw: 0.28, fenster: 1.1, dach: 0.24, decke: 0.24, boden: 0.3 },
  { key: 'ab2016', de: 'ab 2016', ar: 'من ٢٠١٦', aw: 0.2, fenster: 0.9, dach: 0.18, decke: 0.18, boden: 0.25 },
]

// Raumtypen mit Norm-Innentemperatur (DIN EN 12831, vereinfacht)
export const ROOM_TYPES = [
  { key: 'wohnen', de: 'Wohnzimmer', ar: 'صالون', ti: 20 },
  { key: 'kueche', de: 'Küche', ar: 'مطبخ', ti: 20 },
  { key: 'bad', de: 'Bad', ar: 'حمّام', ti: 24 },
  { key: 'wc', de: 'WC', ar: 'حمّام صغير', ti: 20 },
  { key: 'schlafen', de: 'Schlafzimmer', ar: 'غرفة نوم', ti: 18 },
  { key: 'kind', de: 'Kinderzimmer', ar: 'غرفة أولاد', ti: 20 },
  { key: 'essen', de: 'Esszimmer', ar: 'غرفة سفرة', ti: 20 },
  { key: 'flur', de: 'Flur / Diele', ar: 'ممر / مدخل', ti: 15 },
  { key: 'buero', de: 'Büro', ar: 'مكتب', ti: 20 },
  { key: 'keller', de: 'Keller', ar: 'قبو', ti: 12 },
  { key: 'dach', de: 'Dachraum', ar: 'علّية', ti: 20 },
]

// Wände: f = Temperatur-Korrekturfaktor nach DIN EN 12831
export const WAND_TYPEN = [
  { key: 'aussen', de: 'Außenwand', ar: 'جدار خارجي', f: 1 },
  { key: 'unbeheizt', de: 'zu unbeheizt', ar: 'لجوار غير مدفأ', f: 0.5 },
  { key: 'beheizt', de: 'zu beheizt', ar: 'لجوار مدفأ', f: 0 },
]

// Fenster: u = null → U-Wert aus dem Baualter
export const FENSTER_TYPEN = [
  { key: 'alt', de: 'Bestand', ar: 'قديم', u: null },
  { key: '2fach', de: '2-fach', ar: 'مزدوج', u: 1.4 },
  { key: '3fach', de: '3-fach', ar: 'ثلاثي', u: 0.9 },
  { key: 'passiv', de: 'Passivhaus', ar: 'باسيف', u: 0.8 },
]

export const DECKE_TYPEN = [
  { key: 'beheizt', de: 'beheizt darüber', ar: 'غرفة مدفأة فوقه', f: 0 },
  { key: 'dachboden', de: 'Dachboden unbeheizt', ar: 'علّية غير مدفأة فوقه', f: 0.8 },
  { key: 'aussenluft', de: 'Außenluft', ar: 'مكشوف للهوا', f: 1 },
]

export const BODEN_TYPEN = [
  { key: 'erdreich', de: 'Erdreich', ar: 'على التراب', f: 0.5 },
  { key: 'keller', de: 'Keller unbeheizt', ar: 'فوق قبو غير مدفأ', f: 0.5 },
  { key: 'beheizt', de: 'beheizt darunter', ar: 'مدفأ تحته', f: 0 },
]

// Heizkörper-Bauarten: Leistung in W je Meter Baulänge bei 600 mm Bauhöhe,
// bezogen auf 75/65/20 °C (ΔT_m = 50 K).
export const HK_TYPES = [
  { k: '10', de: 'Typ 10', w: 465 },
  { k: '11', de: 'Typ 11', w: 700 },
  { k: '20', de: 'Typ 20', w: 900 },
  { k: '21', de: 'Typ 21', w: 950 },
  { k: '22', de: 'Typ 22', w: 1272 },
  { k: '30', de: 'Typ 30', w: 1320 },
  { k: '33', de: 'Typ 33', w: 1700 },
]

export const HK_LAENGEN = [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000]
export const HK_HOEHEN = [200, 300, 400, 500, 600, 700, 900]

// Thermostatventile: kv-Wert je Voreinstellstufe (Orientierungswerte, DN 15)
export const VALVES = {
  danfoss_ran: {
    label: 'Danfoss RA-N 15',
    steps: [
      { s: 'N', kv: 0.04 },
      { s: '1', kv: 0.05 },
      { s: '2', kv: 0.07 },
      { s: '3', kv: 0.1 },
      { s: '4', kv: 0.15 },
      { s: '5', kv: 0.22 },
      { s: '6', kv: 0.3 },
      { s: '7', kv: 0.4 },
    ],
  },
  heimeier: {
    label: 'Heimeier V-exact II 15',
    steps: [
      { s: '1', kv: 0.05 },
      { s: '2', kv: 0.08 },
      { s: '3', kv: 0.12 },
      { s: '4', kv: 0.18 },
      { s: '5', kv: 0.26 },
      { s: '6', kv: 0.36 },
    ],
  },
  oventrop: {
    label: 'Oventrop AV9 / AQ 15',
    steps: [
      { s: '1', kv: 0.05 },
      { s: '2', kv: 0.09 },
      { s: '3', kv: 0.14 },
      { s: '4', kv: 0.2 },
      { s: '5', kv: 0.27 },
      { s: '6', kv: 0.36 },
    ],
  },
  manuell: {
    label: 'بدون فالف قابل للضبط',
    steps: [],
  },
}

export const ETAGEN = ['KG', 'EG', 'OG', 'DG']
export const ANSCHLUESSE = ['Eck', 'Durchgang', 'Einrohr']
