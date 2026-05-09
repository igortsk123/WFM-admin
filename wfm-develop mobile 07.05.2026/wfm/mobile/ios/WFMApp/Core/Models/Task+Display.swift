import Foundation
import WFMUI

// MARK: - Task Display Extension

/// Work type IDs для которых показываем категорию после зоны
private let workTypeIdsWithCategory: Set<Int> = [4]

/// Extension для форматирования данных Task для отображения в UI
extension Task {

    // MARK: - Badge категории

    /// Текст для badge категории задачи (на основе workType)
    /// - Returns: Текст badge или nil если workType не указан
    func categoryBadgeText() -> String? {
        return workType?.name
    }

    /// Цветовая схема badge категории (на основе workType.id)
    /// Детерминированное назначение цвета через остаток от деления на количество цветов
    /// - Returns: Цвет для WFMBadge
    func categoryBadgeColor() -> BadgeColor {
        guard let workTypeId = workType?.id else {
            return .blue // дефолт если workType не указан
        }

        // 6 доступных цветов
        let colors: [BadgeColor] = [
            .violet,
            .blue,
            .yellow,
            .pink,
            .orange,
            .green
        ]

        // Детерминированно выбираем цвет на основе остатка от деления
        return colors[workTypeId % colors.count]
    }

    /// Название зоны для отображения в карточке задачи
    /// - Returns: Название зоны или "N/A" если зона не указана
    func zoneDisplayName() -> String {
        return zone?.name ?? "N/A"
    }

    /// Нужно ли показывать категорию после зоны
    /// - Returns: true если workType.id входит в список workTypeIdsWithCategory
    func shouldShowCategory() -> Bool {
        guard let workTypeId = workType?.id else { return false }
        return workTypeIdsWithCategory.contains(workTypeId)
    }

    /// Название зоны с категорией (если применимо)
    /// - Returns: "Зона • Категория" если shouldShowCategory() == true, иначе просто название зоны
    func zoneWithCategoryDisplayName() -> String {
        let zoneName = zone?.name ?? "N/A"

        guard shouldShowCategory(),
              let categoryName = category?.name else {
            return zoneName
        }

        return zoneName + " • " + categoryName
    }

    // MARK: - Форматирование времени

    /// Форматированное время для отображения в карточке задачи
    /// - Returns: Строка вида "8:00-9:00 (1 час)" или "120 мин" если timeStart/timeEnd не указаны
    func formattedTimeRange() -> String {
        // Если есть timeStart и timeEnd — показываем диапазон с длительностью
        if let timeStart = timeStart,
           let timeEnd = timeEnd,
           let startTime = parseTime(timeStart),
           let endTime = parseTime(timeEnd) {
            let duration = formatDuration(safePlannedMinutes)
            return "\(startTime)-\(endTime) (\(duration))"
        }

        // Иначе показываем только длительность
        return formatDuration(safePlannedMinutes)
    }

    /// Только длительность задачи без диапазона времени
    /// - Returns: Строка вида "30 мин", "1 час", "2 часа 15 мин"
    func durationOnly() -> String {
        return formatDuration(safePlannedMinutes)
    }

    // MARK: - Private Helpers

    /// Парсит время из формата "HH:MM:SS" в "H:MM"
    private func parseTime(_ timeString: String) -> String? {
        let components = timeString.split(separator: ":")
        guard components.count >= 2,
              let hours = Int(components[0]),
              let minutes = Int(components[1]) else {
            return nil
        }

        return String(format: "%d:%02d", hours, minutes)
    }

    /// Форматирует длительность в минутах в читаемый вид
    /// - Parameter minutes: Длительность в минутах
    /// - Returns: "2 часа", "1 час 30 мин", "45 мин"
    private func formatDuration(_ minutes: Int) -> String {
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

    /// Плюрализация для часов (1 час, 2 часа, 5 часов)
    private func pluralizeHours(_ hours: Int) -> String {
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

// MARK: - PermissionType Extension

/// Extension для получения текста badge из PermissionType
extension PermissionType {

    /// Текст для отображения в badge (краткая форма для категории задачи)
    var badgeText: String {
        switch self {
        case .cashier:
            return "Касса"
        case .salesFloor:
            return "Торговый зал"
        case .selfCheckout:
            return "Касса самообслуживания"
        case .warehouse:
            return "Склад"
        }
    }
}
