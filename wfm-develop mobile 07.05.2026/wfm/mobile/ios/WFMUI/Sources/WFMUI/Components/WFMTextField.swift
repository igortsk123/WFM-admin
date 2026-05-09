import SwiftUI

// MARK: - WFMTextField

/// Базовое текстовое поле дизайн-системы WFM (согласно Figma)
public struct WFMTextField: View {
    @Binding var text: String
    let placeholder: String
    let title: String?
    let caption: String?
    let errorMessage: String?
    let isEnabled: Bool
    let backgroundColor: Color?
    let showClearButton: Bool

    @Environment(\.wfmColors) private var colors
    @FocusState private var isFocused: Bool

    public init(
        text: Binding<String>,
        placeholder: String = "",
        title: String? = nil,
        caption: String? = nil,
        errorMessage: String? = nil,
        isEnabled: Bool = true,
        backgroundColor: Color? = nil,
        showClearButton: Bool = false
    ) {
        self._text = text
        self.placeholder = placeholder
        self.title = title
        self.caption = caption
        self.errorMessage = errorMessage
        self.isEnabled = isEnabled
        self.backgroundColor = backgroundColor
        self.showClearButton = showClearButton
    }

    private var hasError: Bool {
        errorMessage != nil && !errorMessage!.isEmpty
    }

    private var borderColor: Color {
        if hasError {
            return colors.inputBorderError
        } else if isFocused {
            return colors.inputBorder
        } else if !isEnabled {
            return colors.inputBorderDisabled
        } else {
            return colors.inputBorder
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: WFMSpacing.xxs) {
            // Title (label)
            if let title = title {
                Text(title)
                    .font(WFMTypography.body14Bold)
                    .foregroundColor(isEnabled ? colors.inputLabel : colors.inputLabelDisabled)
            }

            // Input field
            HStack(spacing: WFMSpacing.xs) {
                TextField(placeholder, text: $text)
                    .font(WFMTypography.body14Regular)
                    .foregroundColor(isEnabled ? colors.inputTextFilled : colors.inputTextDisabled)
                    .disabled(!isEnabled)
                    .focused($isFocused)

                if showClearButton {
                    Button(action: { text = "" }) {
                        WFMIcons.closeIcon
                            .renderingMode(.template)
                            .foregroundColor(colors.iconSecondary)
                            .frame(width: 16, height: 16)
                            .opacity(!text.isEmpty && isEnabled ? 1 : 0)
                    }
                    .disabled(text.isEmpty || !isEnabled)
                }
            }
            .padding(.leading, WFMSpacing.m)
            .padding(.trailing, showClearButton ? WFMSpacing.l : WFMSpacing.m)
            .padding(.vertical, WFMSpacing.m)
            .background(backgroundColor ?? colors.inputBg)
            .cornerRadius(WFMRadius.l)
            .overlay(
                RoundedRectangle(cornerRadius: WFMRadius.l)
                    .stroke(borderColor, lineWidth: 1)
            )

            // Caption или Error message
            if let errorMessage = errorMessage, !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(WFMTypography.caption12Regular)
                    .foregroundColor(colors.inputCaptionError)
            } else if let caption = caption {
                Text(caption)
                    .font(WFMTypography.body14Regular)
                    .foregroundColor(isEnabled ? colors.inputCaption : colors.inputCaptionDisabled)
            }
        }
    }
}

// MARK: - WFMTextArea

/// Многострочное текстовое поле дизайн-системы WFM
public struct WFMTextArea: View {
    @Binding var text: String
    let placeholder: String
    let title: String?
    let caption: String?
    let errorMessage: String?
    let isEnabled: Bool
    let height: CGFloat
    let backgroundColor: Color?
    let borderColor: Color?
    let textPadding: CGFloat?
    let font: Font?

    @Environment(\.wfmColors) private var colors
    @FocusState private var isFocused: Bool

    public init(
        text: Binding<String>,
        placeholder: String = "",
        title: String? = nil,
        caption: String? = nil,
        errorMessage: String? = nil,
        isEnabled: Bool = true,
        height: CGFloat = 88,
        backgroundColor: Color? = nil,
        borderColor: Color? = nil,
        textPadding: CGFloat? = nil,
        font: Font? = nil
    ) {
        self._text = text
        self.placeholder = placeholder
        self.title = title
        self.caption = caption
        self.errorMessage = errorMessage
        self.isEnabled = isEnabled
        self.height = height
        self.backgroundColor = backgroundColor
        self.borderColor = borderColor
        self.textPadding = textPadding
        self.font = font
    }

    private var hasError: Bool {
        errorMessage != nil && !(errorMessage?.isEmpty ?? true)
    }

    private var actualBackgroundColor: Color {
        backgroundColor ?? colors.inputBg
    }

    private var actualBorderColor: Color {
        if hasError { return colors.inputBorderError }
        return borderColor ?? colors.inputBorder
    }

    private var actualTextPadding: CGFloat {
        textPadding ?? WFMSpacing.xs
    }

    private var actualFont: Font {
        font ?? WFMTypography.body14Regular
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: WFMSpacing.xxs) {
            // Title (label)
            if let title = title {
                Text(title)
                    .font(WFMTypography.body14Bold)
                    .foregroundColor(isEnabled ? colors.inputLabel : colors.inputLabelDisabled)
            }

            // Text editor
            ZStack(alignment: .topLeading) {
                TextEditor(text: $text)
                    .font(actualFont)
                    .foregroundColor(isEnabled ? colors.inputTextFilled : colors.inputTextDisabled)
                    .scrollContentBackground(.hidden)
                    .padding(actualTextPadding)
                    .focused($isFocused)

                if text.isEmpty {
                    Text(placeholder)
                        .font(actualFont)
                        .foregroundColor(colors.inputPlaceholder)
                        .padding(.horizontal, actualTextPadding + 5)
                        .padding(.vertical, actualTextPadding + 8)
                        .allowsHitTesting(false)
                }
            }
            .frame(height: height)
            .background(actualBackgroundColor)
            .cornerRadius(WFMRadius.l)
            .overlay(
                RoundedRectangle(cornerRadius: WFMRadius.l)
                    .stroke(actualBorderColor, lineWidth: 1)
            )
            .disabled(!isEnabled)

            // Error message / Caption
            if let errorMessage = errorMessage, !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(WFMTypography.caption12Regular)
                    .foregroundColor(colors.inputCaptionError)
            } else if let caption = caption {
                Text(caption)
                    .font(WFMTypography.body14Regular)
                    .foregroundColor(isEnabled ? colors.inputCaption : colors.inputCaptionDisabled)
            }
        }
    }
}

// MARK: - WFMPhoneTextField

/// Поле ввода телефона дизайн-системы WFM
/// Формат: +7 (XXX) XXX XX-XX
public struct WFMPhoneTextField: View {
    @Binding var phoneNumber: String
    let title: String?
    let caption: String?
    let errorMessage: String?
    let isEnabled: Bool
    var isFocused: FocusState<Bool>.Binding?

    @Environment(\.wfmColors) private var colors
    @FocusState private var internalFocused: Bool

    public init(
        phoneNumber: Binding<String>,
        title: String? = nil,
        caption: String? = nil,
        errorMessage: String? = nil,
        isEnabled: Bool = true,
        isFocused: FocusState<Bool>.Binding? = nil
    ) {
        self._phoneNumber = phoneNumber
        self.title = title
        self.caption = caption
        self.errorMessage = errorMessage
        self.isEnabled = isEnabled
        self.isFocused = isFocused
    }

    private var hasError: Bool {
        errorMessage != nil && !errorMessage!.isEmpty
    }

    private var focusBinding: FocusState<Bool>.Binding {
        isFocused ?? $internalFocused
    }

    private var borderColor: Color {
        if hasError {
            return colors.inputBorderError
        }
        return colors.inputBorder
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: WFMSpacing.xxs) {
            // Title (label)
            if let title = title {
                Text(title)
                    .font(WFMTypography.body14Bold)
                    .foregroundColor(isEnabled ? colors.inputLabel : colors.inputLabelDisabled)
            }

            // Input field с крестиком для очистки
            HStack(spacing: WFMSpacing.xs) {
                TextField("+7 (999) 999 99-99", text: $phoneNumber)
                    .font(WFMTypography.body14Regular)
                    .foregroundColor(isEnabled ? colors.inputTextFilled : colors.inputTextDisabled)
                    .keyboardType(.phonePad)
                    .disabled(!isEnabled)
                    .focused(focusBinding)
                    .onChange(of: phoneNumber) { _, newValue in
                        phoneNumber = formatPhoneNumber(newValue)
                    }

                // Clear button (X icon) - всегда занимает место, но невидим когда нет текста
                Button(action: {
                    phoneNumber = ""
                }) {
                    WFMIcons.closeIcon
                        .renderingMode(.template)
                        .foregroundColor(isEnabled ? colors.iconSecondary : colors.iconSecondary)
                        .frame(width: 16, height: 16)
                        .opacity(!phoneNumber.isEmpty && isEnabled ? 1 : 0)
                }
                .disabled(phoneNumber.isEmpty || !isEnabled)
            }
            .padding(.trailing,WFMSpacing.l)
            .padding(.leading, WFMSpacing.m)
            .padding(.vertical, WFMSpacing.m)
            .background(colors.inputBg)
            .cornerRadius(WFMRadius.l)
            .overlay(
                RoundedRectangle(cornerRadius: WFMRadius.l)
                    .stroke(borderColor, lineWidth: 1)
            )

            // Error message или Caption
            if let errorMessage = errorMessage, !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(WFMTypography.caption12Regular)
                    .foregroundColor(colors.inputCaptionError)
            } else if let caption = caption {
                Text(caption)
                    .font(WFMTypography.body14Regular)
                    .foregroundColor(isEnabled ? colors.inputCaption : colors.inputCaptionDisabled)
            }
        }
    }

    /// Форматирует номер телефона в формат +7 (XXX) XXX XX-XX
    private func formatPhoneNumber(_ input: String) -> String {
        // Извлекаем только цифры
        let digits = input.filter { $0.isNumber }

        // Ограничиваем до 11 цифр (7 + 10)
        let limitedDigits = String(digits.prefix(11))

        // Если пусто, возвращаем пустую строку
        guard !limitedDigits.isEmpty else { return "" }

        var result = "+7"

        // Получаем цифры после кода страны
        let digitsAfterCode: String
        if limitedDigits.hasPrefix("7") {
            digitsAfterCode = String(limitedDigits.dropFirst())
        } else if limitedDigits.hasPrefix("8") {
            digitsAfterCode = String(limitedDigits.dropFirst())
        } else {
            digitsAfterCode = limitedDigits
        }

        guard !digitsAfterCode.isEmpty else { return result }

        let count = digitsAfterCode.count

        // Форматируем: +7 (XXX) XXX XX-XX
        // Добавляем разделители только если есть цифры после них
        result += " ("
        for (index, char) in digitsAfterCode.prefix(10).enumerated() {
            result.append(char)
            switch index {
            case 2 where count > 3:
                result += ") "
            case 5 where count > 6:
                result += " "
            case 7 where count > 8:
                result += "-"
            default:
                break
            }
        }

        return result
    }
}

// MARK: - Previews

#Preview("WFMTextField - All States") {
    VStack(spacing: 24) {
        // Default (пустое)
        WFMTextField(
            text: .constant(""),
            placeholder: "Номер телефона",
            title: "Дата рождения",
            caption: "Подсказка"
        )

        // Filled (с крестиком для очистки)
        WFMTextField(
            text: .constant("999 888 23 11"),
            placeholder: "Номер телефона",
            title: "Дата рождения"
        )

        // Error (с крестиком)
        WFMTextField(
            text: .constant("999 888 23 11"),
            placeholder: "Номер телефона",
            title: "Дата рождения",
            errorMessage: "Ошибка"
        )

        // Disabled (без крестика)
        WFMTextField(
            text: .constant("999 888 23 11"),
            placeholder: "Номер телефона",
            title: "Дата рождения",
            caption: "Подсказка",
            isEnabled: false
        )
    }
    .padding()
    .wfmTheme()
}

#Preview("WFMTextArea") {
    VStack(spacing: 24) {
        WFMTextArea(
            text: .constant(""),
            placeholder: "Номер телефона",
            title: "Дата рождения",
            caption: "Подсказка"
        )

        WFMTextArea(
            text: .constant("Многострочный\nтекст"),
            placeholder: "Номер телефона"
        )
    }
    .padding()
    .wfmTheme()
}

#Preview("WFMPhoneTextField") {
    VStack(spacing: 24) {
        WFMPhoneTextField(
            phoneNumber: .constant(""),
            title: "Номер телефона",
            caption: "Подсказка"
        )

        WFMPhoneTextField(
            phoneNumber: .constant("+7 (999) 123 45-67"),
            title: "Номер телефона"
        )
    }
    .padding()
    .wfmTheme()
}
