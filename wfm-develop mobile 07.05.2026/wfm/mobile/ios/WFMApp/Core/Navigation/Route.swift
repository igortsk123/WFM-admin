import Foundation

/// Маршруты основного flow приложения (после авторизации)
///
/// Примечание: Auth flow управляется отдельно через AuthRoute в модуле WFMAuth
enum Route: Hashable {
    // Main экраны
    case taskDetail(taskId: String)  // Детали задачи
    case createTask       // Создание задачи
}
