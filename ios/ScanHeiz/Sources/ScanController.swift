import Combine
import Foundation
import RoomPlan
import SwiftUI

/// RoomCaptureViewDelegate erbt von NSCoding — deshalb ist der Controller ein
/// UIViewController (das NSCoding bereits erfüllt) und hält die Kamera-View.
final class ScanController: UIViewController, ObservableObject, RoomCaptureViewDelegate {
    @Published var isScanning = false
    @Published var finished: CapturedRoom?
    @Published var errorText: String?

    private let captureView = RoomCaptureView(frame: .zero)
    private let configuration = RoomCaptureSession.Configuration()

    override func loadView() {
        view = captureView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        captureView.delegate = self
    }

    func start() {
        finished = nil
        errorText = nil
        isScanning = true
        captureView.captureSession.run(configuration: configuration)
    }

    func stop() {
        captureView.captureSession.stop()
        isScanning = false
    }

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

/// SwiftUI-Wrapper für den Scan-Controller.
struct ScannerView: UIViewControllerRepresentable {
    let controller: ScanController

    func makeUIViewController(context: Context) -> ScanController {
        controller
    }

    func updateUIViewController(_ uiViewController: ScanController, context: Context) {}
}
