import SwiftUI

/// Assets WFMAuth модуля
///
/// Использование:
/// ```swift
/// WFMAuthAssets.icTelegram
/// ```
public enum WFMAuthAssets {
    /// Иконка Telegram (24x24pt)
    public static var icTelegram: Image {
        Image("ic_telegram", bundle: .module)
    }
    public static var icMax: Image {
        Image("ic_max", bundle: .module)
    }

    // MARK: - Support resolve images (FAQ illustrations)

    public static var maxResolve: Image {
        Image("max-resolve", bundle: .module)
    }
    public static var tgResolve: Image {
        Image("tg-resolve", bundle: .module)
    }
    public static var phoneResolve: Image {
        Image("phone-resolve", bundle: .module)
    }

    // MARK: - Support icons (16x16pt)

    public static var icMaxSupport: Image {
        Image("ic-max-support", bundle: .module)
    }
    public static var icTgSupport: Image {
        Image("ic-tg-support", bundle: .module)
    }
    public static var icPhoneSupport: Image {
        Image("ic-phone-support", bundle: .module)
    }
    public static var icEmailSupport: Image {
        Image("ic-email-support", bundle: .module)
    }
}
