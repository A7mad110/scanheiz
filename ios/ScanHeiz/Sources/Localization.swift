import Foundation
import SwiftUI

enum AppLang: String {
    case de
    case ar

    var layoutDirection: LayoutDirection {
        self == .ar ? .rightToLeft : .leftToRight
    }
}

struct L {
    /// Deutsch ist die Hauptsprache, Arabisch optional.
    static func t(_ de: String, _ ar: String, _ lang: AppLang) -> String {
        lang == .ar ? ar : de
    }
}
