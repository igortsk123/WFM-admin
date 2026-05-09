import SwiftUI
import WFMUI

/// Экран-заглушка при отсутствии назначения или ошибке загрузки пользователя.
///
/// Два варианта:
/// - `isError = false` → нет назначения (иконка info, "Нет назначения")
/// - `isError = true`  → ошибка API (иконка phone-off, "Номер не найден в базе")
///
/// Автоматически уходит на главный экран при появлении assignment.
struct NoAssignmentsView: View {
    @EnvironmentObject private var container: DependencyContainer
    @EnvironmentObject private var router: AppRouter
    @Environment(\.wfmColors) var colors

    let isError: Bool

    @Environment(\.openURL) private var openURL

    init(isError: Bool = false) {
        self.isError = isError
    }

    var body: some View {
        ZStack {
            colors.surfaceBase.ignoresSafeArea()

            VStack(spacing: WFMSpacing.s) {
                // Иконка-заглушка (56x56, лавандовый круг + иконка)
                featuredIcon

                // Заголовок
                Text(isError ? "Номер не найден в базе" : "Нет назначения")
                    .wfmHeadline18Bold()
                    .foregroundColor(colors.textPrimary)
                    .multilineTextAlignment(.center)

                // Подзаголовок
                Text(isError
                    ? "Обратитесь к руководителю, чтобы его актуализировать"
                    : "Обратитесь к руководителю, чтобы получить его")
                    .wfmBody16Regular()
                    .foregroundColor(colors.cardTextSecondary)
                    .multilineTextAlignment(.center)

                Spacer().frame(height: WFMSpacing.l)

                // Кнопка выхода
                WFMSecondaryButton(text: "Попробовать другой номер") {
                    _Concurrency.Task {
                        await router.logout()
                    }
                }

                if !isError, let url = URL(string: "https://forms.gle/DpzizMQyRMqB16wg7") {
                    WFMSecondaryButton(text: "Заполнить анкету соискателя") {
                        openURL(url)
                    }
                }

                // Кнопка обновления
                WFMTextButton(text: "Обновить") {
                    _Concurrency.Task {
                        await container.userManager.loadCurrentRole()
                    }
                }
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, WFMSpacing.l)
        }
    }

    @ViewBuilder
    private var featuredIcon: some View {
        Image(isError ? "ic-phone-off" : "futered-info")
            .renderingMode(.original)
            .resizable()
            .frame(width: 56, height: 56)
    }
}

#Preview {
    let container = DependencyContainer.shared
    NoAssignmentsView(isError: false)
        .environmentObject(container)
        .environmentObject(AppRouter(
            tokenStorage: container.tokenStorage,
            userManager: container.userManager,
            impersonationStorage: container.impersonationStorage
        ))
        .wfmTheme()
}
