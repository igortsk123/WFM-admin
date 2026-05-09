import Foundation

/// Состояния карточки смены на главном экране
enum ShiftCardState {
    case new            // Новая смена (ещё не началась)
    case inProgress     // Смена в процессе
    case delay          // Опаздывает на смену
    case done           // Смена закрыта
    case noData         // Данные не загрузились
    case empty          // Нет задач
}
