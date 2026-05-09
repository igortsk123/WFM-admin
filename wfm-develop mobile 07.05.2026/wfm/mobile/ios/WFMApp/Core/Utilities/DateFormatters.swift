import Foundation

/// Форматтеры для работы с датами и временем смен
enum DateFormatters {
    /// Форматирует дату смены из ISO формата в русский формат
    /// - Parameter dateString: Дата в формате "YYYY-MM-DD" (например, "2025-02-12")
    /// - Returns: Дата в формате "12 февраля 2025"
    static func formatShiftDate(_ dateString: String) -> String {
        let inputFormatter = DateFormatter()
        inputFormatter.dateFormat = "yyyy-MM-dd"
        inputFormatter.locale = Locale(identifier: "ru_RU")

        guard let date = inputFormatter.date(from: dateString) else {
            return dateString
        }

        let outputFormatter = DateFormatter()
        outputFormatter.dateFormat = "d MMMM yyyy"
        outputFormatter.locale = Locale(identifier: "ru_RU")

        return outputFormatter.string(from: date)
    }

    /// Форматирует текущую дату в формат "EE, d MMMM yyyy" (например, "Пн, 30 марта 2026")
    /// - Returns: Отформатированная текущая дата
    static func formatCurrentDate() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateFormat = "EE, d MMMM yyyy"
        return formatter.string(from: Date())
    }
}

/// Форматтеры для работы со временем смен
enum TimeFormatters {
    /// Форматирует время смены из формата HH:MM:SS в формат "H:MM-H:MM (X часов)"
    /// - Parameters:
    ///   - start: Время начала в формате "HH:MM:SS" (например, "08:00:00")
    ///   - end: Время окончания в формате "HH:MM:SS" (например, "20:00:00")
    /// - Returns: Строка формата "8:00-20:00 (12 часов)"
    static func formatShiftTime(start: String, end: String) -> String {
        let startFormatted = formatTime(start)
        let endFormatted = formatTime(end)

        // Вычисляем длительность в минутах
        let startMin = parseTimeToMinutes(start)
        let endMin = parseTimeToMinutes(end)
        let durationMin = endMin >= startMin ? endMin - startMin : (24 * 60 - startMin + endMin)

        let duration = formatDuration(durationMin)

        return "\(startFormatted)-\(endFormatted) (\(duration))"
    }

    /// Форматирует время из "HH:MM:SS" в "H:MM" (убирает ведущий ноль)
    static func formatTime(_ timeString: String) -> String {
        let components = timeString.split(separator: ":")
        guard components.count >= 2,
              let hour = Int(components[0]),
              let minute = Int(components[1]) else {
            return timeString
        }

        return String(format: "%d:%02d", hour, minute)
    }

    /// Форматирует Date в формат "HH:mm"
    /// - Parameter date: Дата для форматирования
    /// - Returns: Время в формате "HH:mm" (например, "14:30")
    static func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        formatter.locale = Locale(identifier: "ru_RU")
        return formatter.string(from: date)
    }

    /// Парсит время из "HH:MM:SS" в минуты от начала дня
    /// - Parameter timeString: Время в формате "HH:MM:SS"
    /// - Returns: Количество минут от начала дня
    static func parseTimeToMinutes(_ timeString: String) -> Int {
        let parts = timeString.split(separator: ":")
        let h = Int(parts.first ?? "0") ?? 0
        let m = parts.count > 1 ? (Int(parts[1]) ?? 0) : 0
        return h * 60 + m
    }

    /// Форматирует длительность в минутах в читаемый вид
    /// - Parameter minutes: Длительность в минутах
    /// - Returns: "2 часа", "1 час 30 мин", "45 мин"
    static func formatDuration(_ minutes: Int) -> String {
        if minutes < 60 {
            return "\(minutes) мин"
        }

        let hours = minutes / 60
        let remainingMinutes = minutes % 60

        if remainingMinutes == 0 {
            return pluralizeHours(hours)
        } else {
            return "\(pluralizeHours(hours)) \(remainingMinutes) мин"
        }
    }

    /// Вычисляет и форматирует длительность смены
    /// - Parameters:
    ///   - start: Время начала в формате "HH:MM:SS"
    ///   - end: Время окончания в формате "HH:MM:SS"
    /// - Returns: Длительность в формате "12 часов", "8 ч 30 мин" или пустая строка
    static func formatShiftDuration(start: String, end: String) -> String {
        let startMin = parseTimeToMinutes(start)
        let endMin = parseTimeToMinutes(end)
        let diff = endMin >= startMin ? endMin - startMin : (24 * 60 - startMin + endMin)
        return formatDuration(diff)
    }

    /// Форматирует длительность из секунд в читаемый вид
    /// - Parameter seconds: Длительность в секундах
    /// - Returns: "2 ч 30 мин", "1 ч", "45 мин" или "0 мин" если seconds <= 0
    static func formatDurationFromSeconds(_ seconds: Int) -> String {
        guard seconds > 0 else { return "0 мин" }
        let minutes = Int(ceil(Double(seconds) / 60.0))
        return formatDuration(minutes)
    }

    /// Вычисляет и форматирует длительность между двумя датами
    /// - Parameters:
    ///   - start: Дата начала
    ///   - end: Дата окончания
    /// - Returns: Длительность в формате "2 ч 30 мин", "1 ч", "45 мин"
    static func formatDuration(from start: Date, to end: Date) -> String {
        let durationSeconds = end.timeIntervalSince(start)
        let minutes = Int(ceil(durationSeconds / 60.0))
        return formatDuration(minutes)
    }

    /// Возвращает правильную форму слова "час" с числом
    private static func pluralizeHours(_ hours: Int) -> String {
        let lastDigit = hours % 10
        let lastTwoDigits = hours % 100

        if lastTwoDigits >= 11 && lastTwoDigits <= 14 {
            return "\(hours) часов"
        }

        switch lastDigit {
        case 1:
            return "\(hours) час"
        case 2, 3, 4:
            return "\(hours) часа"
        default:
            return "\(hours) часов"
        }
    }
}
