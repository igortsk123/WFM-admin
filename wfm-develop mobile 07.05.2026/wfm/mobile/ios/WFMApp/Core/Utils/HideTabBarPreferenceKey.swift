import SwiftUI

/// Preference Key для скрытия кастомного TabBar
///
/// Используется в ManagerTabView для скрытия таббара при навигации
struct HideTabBarPreferenceKey: PreferenceKey {
    static var defaultValue: Bool = false

    static func reduce(value: inout Bool, nextValue: () -> Bool) {
        value = nextValue()
    }
}
