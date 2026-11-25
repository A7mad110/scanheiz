import { BAUALTER, VALVES } from './data.js'
import { roomType, uValues, wpCheckRoom } from './calc.js'
import { fmt } from './ui.jsx'

export default function Report({ project, rows, totals }) {
  const u = uValues(project)
  const mitDaten = rows.filter((r) => r.room.flaeche || (r.room.hk || []).length)
  const baujahr = BAUALTER.find((b) => b.key === project.baujahr)?.de || '—'

  return (
    <div className="print-only">
      <h1>Heizlast &amp; hydraulischer Abgleich</h1>
      <p className="meta">
        {project.name || 'Projekt'}
        {project.kunde ? ' · Kunde: ' + project.kunde : ''}
        {project.adresse ? ' · ' + project.adresse : ''} · Datum: {project.datum} · Baujahr:{' '}
        {baujahr} · System: {project.tv}/{project.tr} °C · Δp Ventil: {project.dp} kPa · Ventile:{' '}
        {VALVES[project.valve]?.label || '—'}
      </p>

      <h2>1. Raumweise Heizlast (vereinfachtes Hüllflächenverfahren)</h2>
      <table>
        <thead>
          <tr>
            <th>Etage</th>
            <th>Raum</th>
            <th>Fläche m²</th>
            <th>θi °C</th>
            <th>Heizlast W</th>
            <th>W/m²</th>
            <th>Heizkörper</th>
            <th>Leistung W</th>
            <th>V̇ l/h</th>
          </tr>
        </thead>
        <tbody>
          {mitDaten.map(({ room, c }) => (
            <tr key={room.id}>
              <td>{room.etage}</td>
              <td>{room.bezeichnung || roomType(room.raumtyp).de}</td>
              <td>{fmt(room.flaeche, 1)}</td>
              <td>{c.ti}</td>
              <td>{fmt(c.qLoad)}</td>
              <td>{fmt(c.wm2)}</td>
              <td>
                {(room.hk || [])
                  .map((h) => `Typ ${h.typ} ${h.laenge}×${h.hoehe}`)
                  .join(' + ') || '—'}
              </td>
              <td>{fmt(c.qHk)}</td>
              <td>{fmt(c.flow)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="4">Summe</td>
            <td>{fmt(totals.qLoad)}</td>
            <td />
            <td />
            <td>{fmt(totals.qHk)}</td>
            <td>{fmt(totals.flow)}</td>
          </tr>
        </tfoot>
      </table>

      <h2>2. Heizflächen und Voreinstellwerte</h2>
      <table>
        <thead>
          <tr>
            <th>Raum</th>
            <th>Heizkörper</th>
            <th>Nennleistung W</th>
            <th>Leistung W</th>
            <th>V̇ l/h</th>
            <th>kv erf.</th>
            <th>Ventil</th>
            <th>Voreinstellung</th>
          </tr>
        </thead>
        <tbody>
          {rows.flatMap(({ room, c }) =>
            c.radiators.map((r, i) => (
              <tr key={r.id || i}>
                <td>{room.bezeichnung || roomType(room.raumtyp).de}</td>
                <td>
                  Typ {r.typ} · {r.laenge}×{r.hoehe} mm
                </td>
                <td>{fmt(r.qn)}</td>
                <td>{fmt(r.qHk)}</td>
                <td>{fmt(r.flowHk)}</td>
                <td>{fmt(r.kvReq, 2)}</td>
                <td>{r.valveLabel}</td>
                <td className="std">{r.preset}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>

      <h2>3. Eignung für den Wärmepumpenbetrieb</h2>
      <table>
        <thead>
          <tr>
            <th>Raum</th>
            <th>Heizlast W</th>
            <th>55/45 W</th>
            <th>55/45 %</th>
            <th>45/35 W</th>
            <th>45/35 %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ room, c }) => {
            const wp = wpCheckRoom(room, project)
            return (
              <tr key={room.id}>
                <td>{room.bezeichnung || roomType(room.raumtyp).de}</td>
                <td>{fmt(c.qLoad)}</td>
                <td>{fmt(wp[0]?.q)}</td>
                <td>{fmt((wp[0]?.cover || 0) * 100)}</td>
                <td>{fmt(wp[1]?.q)}</td>
                <td>{fmt((wp[1]?.cover || 0) * 100)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <h2>4. Zusammenfassung</h2>
      <table>
        <tbody>
          <tr>
            <td>Gebäude-Heizlast</td>
            <td>{fmt(totals.qLoad)} W</td>
          </tr>
          <tr>
            <td>Installierte Heizkörperleistung bei {project.tv}/{project.tr} °C</td>
            <td>{fmt(totals.qHk)} W</td>
          </tr>
          <tr>
            <td>Gesamtvolumenstrom</td>
            <td>{fmt(totals.flow)} l/h</td>
          </tr>
          <tr>
            <td>U-Werte</td>
            <td>
              AW {u.aw} · Fenster {u.fensterAlt} · Dach {u.dach} · Decke {u.decke} · Boden {u.boden}{' '}
              W/m²K
            </td>
          </tr>
        </tbody>
      </table>

      <p className="note">
        Berechnung: vereinfachtes Hüllflächenverfahren (Transmission über Außenwände, Fenster,
        Außentüren, Wände zu unbeheizten Räumen, Dachschräge, Decke und Boden mit f-Faktoren nach
        DIN EN 12831 sowie Lüftung mit 0,5 1/h). U-Werte nach Baualter bzw. Fenstertyp.
        Heizkörperleistung aus Typ/Baulänge/Bauhöhe, umgerechnet mit n = 1,3 auf die
        Systemtemperaturen. Volumenstrom V̇ = Q / (1,163 · ΔT), raumweise aufgeteilt nach
        Nennleistung der Heizkörper. Voreinstellung aus kv-Wert bei Δp = {project.dp} kPa.
        Orientierungswerte für Bestandsgebäude — keine normgerechte Einzelberechnung.
      </p>

      <div className="sig">
        <span>Ort, Datum</span>
        <span>Unterschrift</span>
      </div>
    </div>
  )
}
