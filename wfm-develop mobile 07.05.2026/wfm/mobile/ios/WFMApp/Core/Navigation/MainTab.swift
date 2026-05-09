import SwiftUI

/// Табы главного экрана
enum MainTab: Int, CaseIterable {
    case home = 0
    case tasks = 1
    case control = 2
    case settings = 3

    /// Заголовок таба
    var title: String {
        switch self {
        case .home: return "Главная"
        case .tasks: return "Задачи"
        case .control: return "Контроль"
        case .settings: return "Профиль"
        }
    }

    /// Иконка таба (из Assets)
    var icon: String {
        switch self {
        case .home: return "ic-tab-home"
        case .tasks: return "ic-tab-tasks"
        case .control: return "ic-tab-control"
        case .settings: return "ic-tab-profile"
        }
    }

    /// Стартовый таб
    static let startTab: MainTab = .home

    /// Табы для работника (без control)
    static let workerTabs: [MainTab] = [.home, .tasks, .settings]

    /// Табы для менеджера (с control)
    static let managerTabs: [MainTab] = [.home, .tasks, .control, .settings]
}
