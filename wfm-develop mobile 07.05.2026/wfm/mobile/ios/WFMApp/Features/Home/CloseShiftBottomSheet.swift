import SwiftUI
import WFMAuth
import WFMUI

// MARK: - Protocol

/// Протокол для ViewModel, который поддерживает закрытие смены
protocol CloseShiftViewModel: ObservableObject {
    var closeShiftTitle: String? { get }
    var closeShiftMessage: String? { get }
}

/// BottomSheet подтверждения закрытия смены
///
/// Использование:
/// ```swift
/// @EnvironmentObject private var bottomSheetManager: BottomSheetManager
///
/// Button("Закрыть смену") {
///     CloseShiftBottomSheet.show(
///         bottomSheetManager: bottomSheetManager,
///         viewModel: viewModel,
///         onDismiss: { viewModel.clearCloseShiftMessage() },
///         onClose: { viewModel.openShift() }
///     )
/// }
/// ```
struct CloseShiftBottomSheet {
    /// Показать BottomSheet подтверждения закрытия смены (реактивный)
    @MainActor
    static func show<T: CloseShiftViewModel>(
        bottomSheetManager: BottomSheetManager,
        viewModel: T,
        onDismiss: @escaping () -> Void,
        onClose: @escaping () -> Void
    ) {
        bottomSheetManager.show(showOverlay: true) {
            CloseShiftBottomSheetReactiveContent(
                bottomSheetManager: bottomSheetManager,
                viewModel: viewModel,
                onDismiss: onDismiss,
                onClose: onClose
            )
        }
    }
}

// MARK: - Reactive Wrapper

/// Обёртка для реактивного обновления content при изменении closeShiftMessage
private struct CloseShiftBottomSheetReactiveContent<T: CloseShiftViewModel>: View {
    let bottomSheetManager: BottomSheetManager
    @ObservedObject var viewModel: T
    let onDismiss: () -> Void
    let onClose: () -> Void

    var body: some View {
        CloseShiftBottomSheetContent(
            title: viewModel.closeShiftTitle ?? "Закрыть смену?",
            message: viewModel.closeShiftMessage,
            onCancel: {
                bottomSheetManager.dismiss()
                onDismiss()
            },
            onClose: {
                onClose()
            }
        )
    }
}

// MARK: - Content

private struct CloseShiftBottomSheetContent: View {
    @Environment(\.wfmColors) private var colors

    let title: String
    let message: String?
    let onCancel: () -> Void
    let onClose: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: WFMSpacing.xxs) {
                Text(title)
                    .font(WFMTypography.headline20Bold)
                    .foregroundColor(colors.textPrimary)
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)

                if let message = message {
                    Text(message)
                        .font(WFMTypography.body16Regular)
                        .foregroundColor(colors.textSecondary)
                        .frame(maxWidth: .infinity)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.top, WFMSpacing.l)
            .padding(.bottom, WFMSpacing.s)
            .padding(.horizontal, WFMSpacing.l)

            HStack(spacing: WFMSpacing.s) {
                WFMSecondaryButton(text: "Отменить", action: onCancel)
                WFMPrimaryButton(text: "Закрыть", action: onClose)
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, WFMSpacing.l)
            .padding(.top, WFMSpacing.l)
            .padding(.bottom, WFMSpacing.l)
        }
    }
}

// MARK: - Preview

private struct CloseShiftBottomSheetPreview: View {
    @StateObject private var bottomSheetManager = BottomSheetManager()
    @StateObject private var viewModel: HomeViewModel
    @Environment(\.wfmColors) private var colors

    init() {
        let container = DependencyContainer.shared
        _viewModel = StateObject(wrappedValue: HomeViewModel(
            role: .worker,
            userManager: container.userManager,
            toastManager: container.toastManager,
            analyticsService: container.analyticsService
        ))
    }

    var body: some View {
        VStack {
            Button("Закрыть смену") {
                CloseShiftBottomSheet.show(
                    bottomSheetManager: bottomSheetManager,
                    viewModel: viewModel,
                    onDismiss: {
                        print("dismissed")
                    },
                    onClose: {
                        print("shift closed")
                    }
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(colors.surfaceBase)
        .environmentObject(bottomSheetManager)
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

#Preview("Close Shift BottomSheet") {
    CloseShiftBottomSheetPreview()
        .wfmTheme()
}
