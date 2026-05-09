import SwiftUI
import WFMUI

/// Универсальная заглушка для разделов в разработке
struct DevelopmentStubView: View {
    @Environment(\.wfmColors) private var colors
    let title: String

    var body: some View {
        VStack(spacing: WFMSpacing.l) {
            Image(systemName: "hammer.fill")
                .font(.system(size: 64))
                .foregroundColor(colors.iconSecondary)

            Text("Раздел в разработке")
                .font(WFMTypography.headline16Bold)
                .foregroundColor(colors.textPrimary)

            Text("Скоро здесь появится \(title)")
                .font(WFMTypography.body14Regular)
                .foregroundColor(colors.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    DevelopmentStubView(title: "Главная")
        .wfmTheme()
}
