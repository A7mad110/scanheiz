import Foundation
import RoomPlan
import SwiftUI

/// Hält die RoomCaptureView und liefert das fertige CapturedRoom.
final class ScanController: NSObject, ObservableObject {
    @Published var view: RoomCaptureView
    @Published var isScanning = false
    @Published var finished: CapturedRoom?
    @Published var errorText: String?

    private let configuration = RoomCaptureSession.Configuration()

    override init() {
        let captureView = RoomCaptureView(frame: .zero)
        view = captureView
        super.init()
        captureView.delegate = self
    }

    func start() {
        finished = nil
        errorText = nil
        isScanning = true
        view.captureSession.run(configuration: configuration)
    }

    func stop() {
        view.captureSession.stop()
        isScanning = false
    }
}

extension ScanController: RoomCaptureViewDelegate {
    func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: Error?) -> Bool {
        if let error = error {
            errorText = error.localizedDescription
        }
        return true
    }

    func captureView(didPresent processedResult: CapturedRoom, error: Error?) {
        if let error = error {
            errorText = error.localizedDescription
        }
        finished = processedResult
        isScanning = false
    }
}

/// SwiftUI-Wrapper für die RoomPlan-Kamera.
struct RoomCaptureViewWrapper: UIViewRepresentable {
    let view: RoomCaptureView

    func makeUIView(context: Context) -> RoomCaptureView {
        view
    }

    func updateUIView(_ uiView: RoomCaptureView, context: Context) {}
}
