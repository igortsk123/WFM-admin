import SwiftUI
import WFMUI

/// BottomSheet подтверждения выхода из профиля
///
/// Использование:
/// ```swift
/// @EnvironmentObject private var bottomSheetManager: BottomSheetManager
///
/// Button("Выйти") {
///     LogoutBottomSheet.show(
///         bottomSheetManager: bottomSheetManager,
///         onLogout: { await router.logout() }
///     )
/// }
/// ```
struct LogoutBottomSheet {
    /// Показать BottomSheet подтверждения выхода
    @MainActor
    static func show(
        bottomSheetManager: BottomSheetManager,
        onLogout: @escaping () -> Void
    ) {
        bottomSheetManager.show(showOverlay: true) {
            LogoutBottomSheetContent(
                onCancel: { bottomSheetManager.dismiss() },
                onLogout: {
                    bottomSheetManager.dismiss()
                    onLogout()
                }
            )
        }
    }
}

// MARK: - Content

private struct LogoutBottomSheetContent: View {
    @Environment(\.wfmColors) private var colors

    let onCancel: () -> Void
    let onLogout: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Text("Вы хотите выйти из профиля?")
                .font(WFMTypography.headline20Bold)
                .foregroundColor(colors.textPrimary)
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)
                .padding(.top, WFMSpacing.l)
                .padding(.bottom, WFMSpacing.s)
                .padding(.horizontal, WFMSpacing.l)

            HStack(spacing: WFMSpacing.s) {
                WFMSecondaryButton(text: "Отменить", action: onCancel)
                WFMPrimaryButton(text: "Выйти", action: onLogout)
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, WFMSpacing.l)
            .padding(.top, WFMSpacing.l)
            .padding(.bottom, WFMSpacing.l)
        }
    }
}

// MARK: - Preview

private struct LogoutBottomSheetPreview: View {
    @StateObject private var bottomSheetManager = BottomSheetManager()
    @Environment(\.wfmColors) private var colors

    var body: some View {
        VStack {
            Button("Выйти") {
                LogoutBottomSheet.show(bottomSheetManager: bottomSheetManager) {
                    print("logout confirmed")
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(colors.surfaceBase)
        .wfmBottomSheet(
            isPresented: $bottomSheetManager.isPresented,
            showOverlay: bottomSheetManager.showOverlay
        ) {
            if let content = bottomSheetManager.content {
                content
            }
        }
    }
}

#Preview("Logout BottomSheet") {
    LogoutBottomSheetPreview()
        .wfmTheme()
}
