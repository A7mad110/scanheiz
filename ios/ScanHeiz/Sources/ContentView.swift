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
                                        "\(fmt1(room.flaeche)) m² · \(room.waende.count) Wände · \(room.fenster.count) Fenster",
                                        "\(fmt1(room.flaeche)) م² · \(room.waende.count) جدران · \(room.fenster.count) شبابيك",
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
        }
        .navigationTitle(room.name)
        .environment(\.layoutDirection, lang.layoutDirection)
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
