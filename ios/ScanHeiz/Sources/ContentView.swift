import Combine
import Foundation
import RoomPlan
import SwiftUI

func fmt1(_ value: Double) -> String {
    String(format: "%.1f", value)
}

struct ContentView: View {
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
                        Label("Raum scannen", systemImage: "camera.viewfinder")
                    }

                    if !RoomCaptureSession.isSupported {
                        Text("Dieses Gerät hat keinen LiDAR-Sensor — Scannen ist nicht möglich.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Räume") {
                    if rooms.isEmpty {
                        Text("Noch kein Raum gescannt.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach($rooms) { $room in
                        NavigationLink {
                            RoomReview(room: $room)
                        } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(room.name).font(.headline)
                                Text("\(fmt1(room.flaeche)) m² · \(room.waende.count) Wände · \(room.fenster.count) Fenster")
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
                        Label("JSON exportieren", systemImage: "square.and.arrow.up")
                    }
                    .disabled(rooms.isEmpty)
                } footer: {
                    Text("Die Datei anschließend in der Web-App über „استيراد مسح“ einlesen.")
                }
            }
            .navigationTitle("ScanHeiz")
            .onAppear { rooms = RoomStore.load() }
            .onChange(of: rooms) { _ in
                RoomStore.save(rooms)
            }
            .fullScreenCover(isPresented: $showScanner) {
                ScannerScreen(
                    nextNumber: rooms.count + 1,
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
    let onDone: (ScannedRoom) -> Void
    let onCancel: () -> Void
    @State private var saved = false

    var body: some View {
        ZStack(alignment: .bottom) {
            RoomCaptureViewWrapper(view: scanner.view)
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

                Text(scanner.isScanning ? "Langsam um den Raum gehen…" : "Bereit")
                    .font(.footnote)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.ultraThinMaterial)
                    .clipShape(Capsule())

                HStack(spacing: 12) {
                    Button("Abbrechen") {
                        scanner.stop()
                        onCancel()
                    }
                    .buttonStyle(.bordered)

                    Button(scanner.isScanning ? "Fertig" : "Start") {
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
        .onReceive(scanner.$finished.compactMap { $0 }) { captured in
            guard !saved else { return }
            saved = true
            onDone(ScanMapper.room(from: captured, name: "Raum \(nextNumber)"))
        }
    }
}

// MARK: - Raum prüfen

struct RoomReview: View {
    @Binding var room: ScannedRoom

    var body: some View {
        Form {
            Section("Raum") {
                TextField("Name", text: $room.name)
                LabeledContent("Fläche", value: "\(fmt1(room.flaeche)) m²")
                LabeledContent("Höhe", value: "\(fmt1(room.hoehe)) m")
            }

            Section {
                ForEach($room.waende) { $wall in
                    HStack {
                        Text("\(fmt1(wall.laenge)) m")
                            .monospacedDigit()
                        Spacer()
                        Picker("", selection: $wall.typ) {
                            Text("außen").tag("aussen")
                            Text("unbeheizt").tag("unbeheizt")
                            Text("beheizt").tag("beheizt")
                        }
                        .labelsHidden()
                    }
                }
            } header: {
                Text("Wände")
            } footer: {
                Text("Welche Wände liegen außen bzw. zu einem unbeheizten Raum?")
            }

            Section("Fenster") {
                if room.fenster.isEmpty {
                    Text("keine erkannt").foregroundStyle(.secondary)
                }
                ForEach($room.fenster) { $window in
                    Text("\(fmt1(window.breite)) × \(fmt1(window.hoehe)) m")
                        .monospacedDigit()
                }
            }

            Section("Türen") {
                if room.tueren.isEmpty {
                    Text("keine erkannt").foregroundStyle(.secondary)
                }
                ForEach($room.tueren) { $door in
                    Text("\(fmt1(door.breite)) × \(fmt1(door.hoehe)) m")
                        .monospacedDigit()
                }
            }
        }
        .navigationTitle(room.name)
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
