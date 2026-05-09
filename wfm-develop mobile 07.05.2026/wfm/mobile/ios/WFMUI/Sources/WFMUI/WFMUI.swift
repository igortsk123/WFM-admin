/// WFMUI - UI модуль дизайн-системы WFM
///
/// Содержит:
/// - Theme: WFMColors, WFMTypography, WFMSpacing, WFMRadius
/// - Components: WFMButton, WFMTextField, WFMSegmentedControl, WFMLoader
/// - Icons: WFMIcons (SVG иконки из Figma)
///
/// Использование:
/// ```swift
/// import WFMUI
///
/// struct ContentView: View {
///     @Environment(\.wfmColors) var colors
///
///     var body: some View {
///         VStack {
///             // Кнопка
///             WFMPrimaryButton(text: "Далее") {
///                 print("Tapped")
///             }
///
///             // Иконка
///             WFMIcons.arrowLeft
///                 .foregroundColor(colors.iconPrimary)
///         }
///         .wfmTheme()
///     }
/// }
/// ```

// Re-export all public types
@_exported import SwiftUI
