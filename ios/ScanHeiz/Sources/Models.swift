import Foundation
import RoomPlan
import simd

// MARK: - Datenmodell (wird als JSON exportiert und in der Web-App importiert)

struct ScannedWindow: Codable, Identifiable, Hashable {
    var id = UUID()
    var breite: Double
    var hoehe: Double
    var anzahl: Int = 1
}

struct ScannedWall: Codable, Identifiable, Hashable {
    var id = UUID()
    var laenge: Double
    var typ: String = "aussen" // aussen | unbeheizt | beheizt
    var fenster: Int = 0
}

struct ScannedRoom: Codable, Identifiable, Hashable {
    var id = UUID()
    var name: String
    var flaeche: Double
    var hoehe: Double
    var waende: [ScannedWall]
    var fenster: [ScannedWindow]
    var tueren: [ScannedWindow]
}

struct ScanExport: Codable {
    var source = "scanheiz-ios"
    var version = 1
    var rooms: [ScannedRoom]
}

// MARK: - Umrechnung CapturedRoom -> ScanHeiz-Daten

enum ScanMapper {
    static func round2(_ value: Double) -> Double {
        (value * 100).rounded() / 100
    }

    static func room(from captured: CapturedRoom, name: String) -> ScannedRoom {
        let wallSurfaces = captured.walls

        // Fenster nach Wand gruppieren (parentIdentifier)
        var windowsByWall: [UUID: Int] = [:]
        var windows: [ScannedWindow] = []
        for window in captured.windows {
            if let parent = window.parentIdentifier {
                windowsByWall[parent, default: 0] += 1
            }
            windows.append(
                ScannedWindow(
                    breite: round2(Double(window.dimensions.x)),
                    hoehe: round2(Double(window.dimensions.y))
                )
            )
        }

        var doors: [ScannedWindow] = []
        for door in captured.doors {
            doors.append(
                ScannedWindow(
                    breite: round2(Double(door.dimensions.x)),
                    hoehe: round2(Double(door.dimensions.y))
                )
            )
        }

        var walls: [ScannedWall] = []
        for wall in wallSurfaces {
            walls.append(
                ScannedWall(
                    laenge: round2(Double(wall.dimensions.x)),
                    typ: "aussen",
                    fenster: windowsByWall[wall.identifier] ?? 0
                )
            )
        }

        let height = wallSurfaces.map { Double($0.dimensions.y) }.max() ?? 2.5

        return ScannedRoom(
            name: name,
            flaeche: round2(area(of: captured)),
            hoehe: round2(height),
            waende: walls,
            fenster: windows,
            tueren: doors
        )
    }

    /// Grundfläche aus den Wand-Endpunkten (Shoelace über die um den
    /// Mittelpunkt sortierten Ecken). Für rechteckige Räume exakt,
    /// bei verwinkelten Räumen eine Näherung.
    static func area(of room: CapturedRoom) -> Double {
        var points: [simd_float2] = []
        for wall in room.walls {
            let length = wall.dimensions.x
            let center = simd_float2(wall.transform.columns.3.x, wall.transform.columns.3.z)
            let direction = simd_float2(wall.transform.columns.0.x, wall.transform.columns.0.z)
            points.append(center + direction * (length / 2))
            points.append(center - direction * (length / 2))
        }
        guard points.count >= 3 else { return 0 }

        let count = Float(points.count)
        let cx = points.reduce(Float(0)) { $0 + $1.x } / count
        let cy = points.reduce(Float(0)) { $0 + $1.y } / count

        let sorted = points.sorted {
            atan2(Double($0.y - cy), Double($0.x - cx)) < atan2(Double($1.y - cy), Double($1.x - cx))
        }

        var sum: Float = 0
        for index in 0..<sorted.count {
            let a = sorted[index]
            let b = sorted[(index + 1) % sorted.count]
            sum += a.x * b.y - b.x * a.y
        }
        return Double(abs(sum) / 2)
    }
}

// MARK: - Speichern

enum RoomStore {
    static var fileURL: URL {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return dir.appendingPathComponent("scanheiz-rooms.json")
    }

    static func load() -> [ScannedRoom] {
        guard let data = try? Data(contentsOf: fileURL) else { return [] }
        return (try? JSONDecoder().decode([ScannedRoom].self, from: data)) ?? []
    }

    static func save(_ rooms: [ScannedRoom]) {
        guard let data = try? JSONEncoder().encode(rooms) else { return }
        try? data.write(to: fileURL)
    }

    static func exportURL(_ rooms: [ScannedRoom]) -> URL? {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(ScanExport(rooms: rooms)) else { return nil }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("scanheiz.json")
        do {
            try data.write(to: url)
            return url
        } catch {
            return nil
        }
    }
}
