import Foundation

/// Маршруты внутри Auth flow
public enum AuthRoute: Hashable {
    /// Экран ввода кода подтверждения
    case codeInput
    /// Экран поддержки
    case support
}
