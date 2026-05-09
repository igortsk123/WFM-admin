import Foundation
#if canImport(UIKit)
import UIKit
#endif

/// Утилиты для работы с почтой
public enum EmailUtils {
    /// Открывает почтовый клиент с заполненным адресатом
    public static func compose(to address: String) {
        guard let url = URL(string: "mailto:\(address)") else { return }
        #if !os(macOS)
        UIApplication.shared.open(url)
        #endif
    }
}
