import SwiftUI
import WFMUI
import Kingfisher

/// Компонент заголовка с профилем пользователя
///
/// Использование:
/// ```swift
/// ProfileHeaderView(
///     greetingName: "Иван",
///     formattedDate: "Пн, 20 января 2025",
///     avatarUrl: "https://example.com/avatar.jpg"
/// )
/// ```
struct ProfileHeaderView: View {
    @Environment(\.wfmColors) var colors

    let greetingName: String
    let formattedDate: String
    let avatarUrl: String?

    var body: some View {
        HStack(spacing: WFMSpacing.s) {
            // Аватар пользователя
            if let avatarUrl = avatarUrl, let url = URL(string: avatarUrl) {
                KFImage(url)
                    .placeholder {
                        avatarPlaceholder
                    }
                    .resizable()
                    .scaledToFill()
                    .frame(width: 40, height: 40)
                    .clipShape(Circle())
            } else {
                avatarPlaceholder
            }

            // Текст приветствия
            VStack(alignment: .leading, spacing: 0) {
                Text("Привет, \(greetingName)")
                    .font(WFMTypography.headline16Bold)
                    .foregroundColor(colors.textPrimary)
                    .lineLimit(2)

                Text(formattedDate)
                    .font(WFMTypography.body14Regular)
                    .foregroundColor(colors.textSecondary)
            }

            Spacer()
        }
        .padding(.horizontal, WFMSpacing.l)
        .padding(.vertical, WFMSpacing.s)
    }

    // MARK: - Avatar Placeholder

    private var avatarPlaceholder: some View {
        Circle()
            .fill(colors.iconImgEmptyState)
            .frame(width: 40, height: 40)
            .overlay(
                WFMIcons.person
                    .resizable()
                    .renderingMode(.template)
                    .foregroundColor(colors.iconSecondary)
                    .frame(width: 20, height: 20)
            )
    }
}

#Preview {
    ProfileHeaderView(
        greetingName: "Иван",
        formattedDate: "Пн, 20 января 2025",
        avatarUrl: nil
    )
    .wfmTheme()
}
