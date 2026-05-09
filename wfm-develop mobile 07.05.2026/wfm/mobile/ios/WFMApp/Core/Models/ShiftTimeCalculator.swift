import Foundation

/// Утилита для расчета времени смен
///
/// Содержит все функции для форматирования и расчета времени:
/// - Определение опоздания на смену
/// - Парсинг времени начала/конца смены
/// - Форматирование сообщений о времени
struct ShiftTimeCalculator {

    // MARK: - Public Methods

    /// Определить, опаздывает ли пользователь на смену
    static func isShiftLate(_ shift: CurrentShift, currentTime: Date = Date()) -> Bool {
        guard let start = shiftStartDate(shift) else { return false }
        return currentTime > start
    }

    /// Получить дату и время начала смены
    static func shiftStartDate(_ shift: CurrentShift?) -> Date? {
        guard let shift = shift,
              let dateStr = shift.shiftDate,
              let timeStr = shift.startTime else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        let timeOnly = String(timeStr.prefix(8))
        return formatter.date(from: "\(dateStr) \(timeOnly)")
    }

    /// Получить дату и время конца смены
    static func shiftEndDate(_ shift: CurrentShift?) -> Date? {
        guard let shift = shift, let timeStr = shift.endTime else { return nil }
        let timeOnly = String(timeStr.prefix(8))
        let dateStr: String
        if let d = shift.shiftDate {
            dateStr = d
        } else if let openedAt = shift.openedAt {
            let dateFmt = DateFormatter()
            dateFmt.dateFormat = "yyyy-MM-dd"
            dateStr = dateFmt.string(from: openedAt)
        } else {
            return nil
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        return formatter.date(from: "\(dateStr) \(timeOnly)")
    }

    /// Форматировать количество минут до начала смены
    ///
    /// Примеры:
    /// - 0 мин → "Начинается сейчас"
    /// - 30 мин → "Начнется через 30 мин"
    /// - 90 мин → "Начнется через 1 ч 30 мин"
    static func formatMinutesUntil(_ minutes: Int) -> String {
        if minutes == 0 { return "Начинается сейчас" }
        let h = minutes / 60
        let m = minutes % 60
        if h == 0 { return "Начнется через \(m) мин" }
        if m == 0 { return "Начнется через \(h) ч" }
        return "Начнется через \(h) ч \(m) мин"
    }

    /// Форматировать количество минут опоздания
    ///
    /// Примеры:
    /// - 0 мин → "Вы опаздываете"
    /// - 15 мин → "Вы опаздываете на 15 мин"
    /// - 75 мин → "Вы опаздываете на 1 ч 15 мин"
    static func formatMinutesLate(_ minutes: Int) -> String {
        if minutes == 0 { return "Вы опаздываете" }
        let h = minutes / 60
        let m = minutes % 60
        if h == 0 { return "Вы опаздываете на \(m) мин" }
        if m == 0 { return "Вы опаздываете на \(h) ч" }
        return "Вы опаздываете на \(h) ч \(m) мин"
    }

    /// Форматировать оставшееся время до конца смены
    ///
    /// Примеры:
    /// - 0 мин → "Смена заканчивается"
    /// - 45 мин → "До конца смены 45 мин"
    /// - 120 мин → "До конца смены 2 ч"
    static func formatMinutesLeft(_ minutes: Int) -> String {
        if minutes == 0 { return "Смена заканчивается" }
        let h = minutes / 60
        let m = minutes % 60
        if h == 0 { return "До конца смены \(m) мин" }
        if m == 0 { return "До конца смены \(h) ч" }
        return "До конца смены \(h) ч \(m) мин"
    }
}
