import Combine
import Foundation
import RoomPlan
import SwiftUI

func fmt1(_ value: Double) -> String {
    String(format: "%.1f", value)
}

struct ContentView: View {
    @AppStorage("appLang") private var langRaw = "de"
    private var lang: AppLang { AppLang(rawValue: langRaw) ?? .de }

    @State private var rooms: [ScannedRoom] = RoomStore.load()
    @State private var showScanner = false
    @State private var exportURL: URL?
    @State private var showShare = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        showScanner = true
                    } label: {
                        Label(L.t("Raum scannen", "مسح غرفة", lang), systemImage: "camera.viewfinder")
                    }

                    if !RoomCaptureSession.isSupported {
                        Text(
                            L.t(
                                "Dieses Gerät hat keinen LiDAR-Sensor — Scannen ist nicht möglich.",
                                "هذا الجهاز ما فيه LiDAR — المسح مش ممكن.",
                                lang
                            )
                        )
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    }
                }

                Section(L.t("Räume", "الغرف", lang)) {
                    if rooms.isEmpty {
                        Text(L.t("Noch kein Raum gescannt.", "ما في غرف ممسوحة بعد.", lang))
                            .foregroundStyle(.secondary)
                    }
                    ForEach($rooms) { $room in
                        NavigationLink {
                            RoomReview(room: $room, lang: lang)
                        } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(room.name).font(.headline)
                                Text(
                                    L.t(
                                        "\(fmt1(room.flaeche)) m² · \(room.waende.count) Wände · \(room.fenster.count) Fenster · \((room.radiators ?? []).count) Heizkörper",
                                        "\(fmt1(room.flaeche)) م² · \(room.waende.count) جدران · \(room.fenster.count) شبابيك · \((room.radiators ?? []).count) شوفاجات",
                                        lang
                                    )
                                )
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .onDelete { indexSet in
                        rooms.remove(atOffsets: indexSet)
                        RoomStore.save(rooms)
                    }
                }

                Section {
                    Button {
                        if let url = RoomStore.exportURL(rooms) {
                            exportURL = url
                            showShare = true
                        }
                    } label: {
                        Label(L.t("JSON exportieren", "تصدير JSON", lang), systemImage: "square.and.arrow.up")
                    }
                    .disabled(rooms.isEmpty)
                } footer: {
                    Text(
                        L.t(
                            "Die Datei anschließend in der Web-App über 📥 importieren.",
                            "بعدها استورد الملف ببرنامج الويب من زر 📥.",
                            lang
                        )
                    )
                }
            }
            .navigationTitle("SAAM GMBH")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        langRaw = lang == .de ? "ar" : "de"
                    } label: {
                        Text(lang == .de ? "ع" : "DE")
                            .font(.subheadline.bold())
                            .frame(minWidth: 38, minHeight: 28)
                            .background(Color.accentColor.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .accessibilityLabel(L.t("Sprache wechseln", "تغيير اللغة", lang))
                }
            }
            .environment(\.layoutDirection, lang.layoutDirection)
            .onAppear { rooms = RoomStore.load() }
            .onChange(of: rooms) { _ in
                RoomStore.save(rooms)
            }
            .fullScreenCover(isPresented: $showScanner) {
                ScannerScreen(
                    nextNumber: rooms.count + 1,
                    lang: lang,
                    onDone: { room in
                        rooms.append(room)
                        RoomStore.save(rooms)
                        showScanner = false
                    },
                    onCancel: { showScanner = false }
                )
            }
            .sheet(isPresented: $showShare) {
                if let url = exportURL {
                    ShareSheet(url: url)
                }
            }
        }
    }
}

// MARK: - Scanner

struct ScannerScreen: View {
    @StateObject private var scanner = ScanController()
    let nextNumber: Int
    let lang: AppLang
    let onDone: (ScannedRoom) -> Void
    let onCancel: () -> Void
    @State private var saved = false

    var body: some View {
        ZStack(alignment: .bottom) {
            ScannerView(controller: scanner)
                .ignoresSafeArea()

            VStack(spacing: 12) {
                if let error = scanner.errorText {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.white)
                        .padding(8)
                        .background(Color.red.opacity(0.85))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Text(
                    scanner.isScanning
                        ? L.t("Langsam um den Raum gehen…", "امشِ ببطء حول الغرفة…", lang)
                        : L.t("Bereit", "جاهز", lang)
                )
                .font(.footnote)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())

                HStack(spacing: 12) {
                    Button(L.t("Abbrechen", "إلغاء", lang)) {
                        scanner.stop()
                        onCancel()
                    }
                    .buttonStyle(.bordered)

                    Button(
                        scanner.isScanning
                            ? L.t("Fertig", "انتهى", lang)
                            : L.t("Start", "ابدأ", lang)
                    ) {
                        if scanner.isScanning {
                            scanner.stop()
                        } else {
                            scanner.start()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(.bottom, 28)
            }
        }
        .environment(\.layoutDirection, lang.layoutDirection)
        .onReceive(scanner.$finished.compactMap { $0 }) { captured in
            guard !saved else { return }
            saved = true
            let name = L.t("Raum \(nextNumber)", "غرفة \(nextNumber)", lang)
            onDone(ScanMapper.room(from: captured, name: name))
        }
    }
}

// MARK: - Raum prüfen

struct RoomReview: View {
    @Binding var room: ScannedRoom
    let lang: AppLang

    var body: some View {
        Form {
            Section(L.t("Raum", "الغرفة", lang)) {
                TextField(L.t("Name", "الاسم", lang), text: $room.name)
                LabeledContent(L.t("Fläche", "المساحة", lang), value: "\(fmt1(room.flaeche)) m²")
                LabeledContent(L.t("Höhe", "الارتفاع", lang), value: "\(fmt1(room.hoehe)) m")
            }

            Section {
                ForEach($room.waende) { $wall in
                    HStack {
                        Text("\(fmt1(wall.laenge)) m")
                            .monospacedDigit()
                        Spacer()
                        Picker("", selection: $wall.typ) {
                            Text(L.t("außen", "خارجي", lang)).tag("aussen")
                            Text(L.t("unbeheizt", "غير مدفأ", lang)).tag("unbeheizt")
                            Text(L.t("beheizt", "مدفأ", lang)).tag("beheizt")
                        }
                        .labelsHidden()
                    }
                }
            } header: {
                Text(L.t("Wände", "الجدران", lang))
            } footer: {
                Text(
                    L.t(
                        "Welche Wände liegen außen bzw. zu einem unbeheizten Raum?",
                        "أي الجدران خارجي أو لجوار غير مدفأ؟",
                        lang
                    )
                )
            }

            Section(L.t("Fenster", "الشبابيك", lang)) {
                if room.fenster.isEmpty {
                    Text(L.t("keine erkannt", "ما انعرف ولا واحد", lang))
                        .foregroundStyle(.secondary)
                }
                ForEach($room.fenster) { $window in
                    Text("\(fmt1(window.breite)) × \(fmt1(window.hoehe)) m")
                        .monospacedDigit()
                }
            }

            Section(L.t("Türen", "الأبواب", lang)) {
                if room.tueren.isEmpty {
                    Text(L.t("keine erkannt", "ما انعرف ولا واحد", lang))
                        .foregroundStyle(.secondary)
                }
                ForEach($room.tueren) { $door in
                    Text("\(fmt1(door.breite)) × \(fmt1(door.hoehe)) m")
                        .monospacedDigit()
                }
            }

            Section {
                if heaters.isEmpty {
                    Text(L.t("kein Heizkörper erfasst", "ما في شوفاج مسجّل", lang))
                        .foregroundStyle(.secondary)
                }
                ForEach(heaters) { heater in
                    RadiatorRow(radiator: binding(for: heater.id), lang: lang) {
                        room.radiators = heaters.filter { $0.id != heater.id }
                    }
                }
                Button {
                    room.radiators = heaters + [ScannedRadiator()]
                } label: {
                    Label(L.t("Heizkörper hinzufügen", "أضف شوفاج", lang), systemImage: "plus.circle")
                }
            } header: {
                Text(L.t("Heizkörper", "الشوفاجات", lang))
            } footer: {
                Text(
                    L.t(
                        "LiDAR erkennt keine Heizkörper. Bitte Bauart, Höhe und Länge hier eintragen — daraus entsteht später die Einstellung.",
                        "الليزر ما بيعرف الشوفاج. عبّي النوع والارتفاع والطول هون — ومنها بيطلع التعيين (Einstellung).",
                        lang
                    )
                )
            }
        }
        .navigationTitle(room.name)
        .environment(\.layoutDirection, lang.layoutDirection)
    }

    private var heaters: [ScannedRadiator] { room.radiators ?? [] }

    private func binding(for id: UUID) -> Binding<ScannedRadiator> {
        Binding(
            get: { heaters.first(where: { $0.id == id }) ?? ScannedRadiator() },
            set: { updated in
                var list = heaters
                if let index = list.firstIndex(where: { $0.id == id }) {
                    list[index] = updated
                } else {
                    list.append(updated)
                }
                room.radiators = list
            }
        )
    }
}

// MARK: - Heizkörper-Zeile

struct RadiatorRow: View {
    @Binding var radiator: ScannedRadiator
    let lang: AppLang
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Typ \(radiator.typ)")
                    .font(.subheadline.bold())
                Spacer()
                Button(role: .destructive, action: onDelete) {
                    Image(systemName: "trash")
                }
                .buttonStyle(.borderless)
            }

            Picker(L.t("Bauart", "النوع", lang), selection: $radiator.typ) {
                ForEach(HKOptions.typen, id: \.self) { typ in
                    Text("Typ \(typ)").tag(typ)
                }
            }
            .pickerStyle(.menu)

            Picker(L.t("Länge", "الطول", lang), selection: $radiator.laenge) {
                ForEach(HKOptions.laengen, id: \.self) { laenge in
                    Text("\(Int(laenge)) mm").tag(laenge)
                }
            }
            .pickerStyle(.menu)

            Picker(L.t("Höhe", "الارتفاع", lang), selection: $radiator.hoehe) {
                ForEach(HKOptions.hoehen, id: \.self) { hoehe in
                    Text("\(Int(hoehe)) mm").tag(hoehe)
                }
            }
            .pickerStyle(.menu)

            Stepper(
                L.t("Anzahl", "العدد", lang) + ": \(radiator.anzahl)",
                value: $radiator.anzahl,
                in: 1...6
            )
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Teilen

struct ShareSheet: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
