import SwiftUI
import WFMUI

/// Экран приветствия приложения
///
/// Показывается когда пользователь не авторизован.
/// Содержит информацию о приложении и кнопку "Войти" для перехода к авторизации.
struct WelcomeView: View {
    @Environment(\.wfmColors) var colors

    let onLoginTapped: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Контент (логотип, заголовок, описание)
            VStack(alignment: .leading, spacing: WFMSpacing.m) {
                // Логотип приложения
                WFMIcons.appLogo
                    .resizable()
                    .frame(width: 40, height: 40)
                    .clipShape(RoundedRectangle(cornerRadius: WFMRadius.s))

                // Заголовок
                Text("Умный сотрудник")
                    .font(WFMTypography.headline24Bold)
                    .foregroundColor(colors.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Описание
                Text("Планируйте свои смены, берите дополнительные задачи и отслеживайте свою эффективность каждый день!")
                    .font(WFMTypography.body16Regular)
                    .foregroundColor(colors.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()

            // Кнопка "Войти"
            WFMPrimaryButton(text: "Войти", action: onLoginTapped)
                .fixedSize(horizontal: false, vertical: true)

        }
        .padding(.horizontal, WFMSpacing.l)
        .padding(.top, WFMSpacing.xxxl)
        .padding(.bottom, WFMSpacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(colors.surfaceBase)
    }
}

#Preview {
    WelcomeView(onLoginTapped: {
        print("Login tapped")
    })
    .wfmTheme()
}
