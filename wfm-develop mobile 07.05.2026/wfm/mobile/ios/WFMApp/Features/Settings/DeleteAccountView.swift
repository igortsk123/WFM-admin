import SwiftUI
import WFMUI

/// Экран подтверждения удаления учётной записи
///
/// Отображает предупреждение, случайный 4-значный код и поле ввода.
/// Кнопка "Удалить" становится активной только при совпадении кодов.
struct DeleteAccountView: View {
    @Environment(\.wfmColors) private var colors
    @Environment(\.dismiss) private var dismiss

    let viewModel: SettingsViewModel
    let onSuccess: () -> Void

    private let confirmCode = String(Int.random(in: 1000...9999))
    @State private var enteredCode = ""
    @State private var isLoading = false
    @State private var errorMessage: String? = nil

    private var codeMatches: Bool {
        enteredCode == confirmCode
    }

    var body: some View {
        VStack(spacing: 0) {
            // Заголовок с кнопкой назад
            HStack(spacing: 0) {
                Button {
                    dismiss()
                } label: {
                    HStack(spacing: 0) {
                        ZStack {
                            Color.clear.frame(width: 44, height: 44)
                            WFMIcons.arrowLeft
                                .resizable()
                                .renderingMode(.template)
                                .frame(width: 24, height: 24)
                                .foregroundColor(colors.iconPrimary)
                        }
                        Text("Удалить учётную запись")
                            .font(WFMTypography.headline16Bold)
                            .tracking(WFMTypography.LetterSpacing.headline16Bold)
                            .foregroundColor(colors.textPrimary)
                    }
                }
                .buttonStyle(PlainButtonStyle())

                Spacer()
            }
            .padding(.horizontal, WFMSpacing.m)
            .padding(.vertical, WFMSpacing.xxs)
            .background(colors.surfaceBase)
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(colors.barsBorder),
                alignment: .bottom
            )

            // Контент
            ScrollView {
                VStack(alignment: .leading, spacing: WFMSpacing.xl) {
                    // Предупреждение
                    Text("Это действие нельзя отменить. Все ваши данные будут безвозвратно удалены.")
                        .font(WFMTypography.body14Regular)
                        .foregroundColor(colors.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    // Блок с кодом
                    VStack(alignment: .leading, spacing: WFMSpacing.s) {
                        Text("Для подтверждения введите код:")
                            .font(WFMTypography.body14Regular)
                            .foregroundColor(colors.textSecondary)

                        Text(confirmCode)
                            .font(WFMTypography.headline20Bold)
                            .foregroundColor(colors.textPrimary)
                            .frame(maxWidth: .infinity)
                            .multilineTextAlignment(.center)
                            .padding(.vertical, WFMSpacing.m)
                            .background(colors.surfaceSecondary)
                            .overlay(
                                RoundedRectangle(cornerRadius: WFMRadius.l)
                                    .stroke(colors.borderSecondary, lineWidth: 1)
                            )
                            .cornerRadius(WFMRadius.l)
                    }

                    // Поле ввода кода
                    WFMTextField(
                        text: $enteredCode,
                        placeholder: "Введите код",
                        errorMessage: errorMessage
                    )
                    .keyboardType(.numberPad)

                    // Кнопки
                    HStack(spacing: WFMSpacing.s) {
                        WFMSecondaryButton(text: "Отменить") {
                            dismiss()
                        }

                        if isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                        } else {
                            WFMPrimaryButton(text: "Удалить", isEnabled: codeMatches) {
                                deleteAccount()
                            }
                        }
                    }
                }
                .padding(WFMSpacing.xl)
            }

            Spacer(minLength: 0)
        }
        .background(colors.surfaceBase)
    }

    private func deleteAccount() {
        isLoading = true
        errorMessage = nil
        _Concurrency.Task {
            do {
                try await viewModel.deleteAccount()
                isLoading = false
                onSuccess()
            } catch {
                isLoading = false
                errorMessage = "Не удалось удалить аккаунт. Попробуйте позже или обратитесь в поддержку."
            }
        }
    }
}
