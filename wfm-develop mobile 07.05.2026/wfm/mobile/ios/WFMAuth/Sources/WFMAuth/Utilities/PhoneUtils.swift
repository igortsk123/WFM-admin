import Foundation
#if canImport(UIKit)
import UIKit
#endif

/// Утилиты для работы с телефонными звонками
public enum PhoneUtils {
    /// Открывает стандартный экран звонка с заданным номером
    public static func call(_ phoneNumber: String) {
        let cleaned = phoneNumber.filter { $0.isNumber || $0 == "+" }
        guard let url = URL(string: "tel:\(cleaned)") else { return }
        #if !os(macOS)
        UIApplication.shared.open(url)
        #endif
    }
}
