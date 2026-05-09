import SwiftUI

/// Иконки дизайн-системы WFM
public enum WFMIcons {
    /// Стрелка назад (arrow-left из Figma)
    public static var arrowLeft: Image {
        Image("arrow-left", bundle: .module)
    }

    /// Иконка закрытия/очистки (close-icon из Figma)
    public static var closeIcon: Image {
        Image("close-icon", bundle: .module)
    }

    /// Иконка галочки (check-icon из Figma)
    public static var checkIcon: Image {
        Image("ic-check", bundle: .module)
    }

    /// Логотип приложения (app-logo из Figma)
    public static var appLogo: Image {
        Image("app-logo", bundle: .module)
    }

    /// Иконка pin filled (ic-pin-filled из Figma)
    public static var pinFilledIcon: Image {
        Image("ic-pin-filled", bundle: .module)
    }

    /// Шеврон вправо (ic-chevron-right из Figma)
    public static var chevronRight: Image {
        Image("ic-chevron-right", bundle: .module)
    }

    /// Шеврон вверх (ic-chevron-up из Figma)
    public static var chevronUp: Image {
        Image("ic-chevron-up", bundle: .module)
    }

    /// Шеврон вниз (ic-chevron-down из Figma)
    public static var chevronDown: Image {
        Image("ic-chevron-down", bundle: .module)
    }

    /// Заглушка аватара (ic-person из Figma)
    public static var person: Image {
        Image("ic-person", bundle: .module)
    }
}
