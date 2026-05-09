import SwiftUI
import WFMUI

/// Bottom Sheet для ошибки CONFLICT - "У сотрудника уже есть активная задача"
///
/// Показывается когда работник пытается начать задачу, но у него уже есть активная задача.
/// Дизайн: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3519-17575
///
/// Использование:
/// ```swift
/// @EnvironmentObject private var container: DependencyContainer
///
/// // При CONFLICT ошибке:
/// ActiveTaskConflictBottomSheet.show(
///     bottomSheetManager: container.bottomSheetManager,
///     activeTaskId: error.activeTaskId,
///     onNavigateToTask: { taskId in
///         router.navigateToTaskDetail(taskId: taskId)
///     }
/// )
/// ```
struct ActiveTaskConflictBottomSheet {
    /// Показать BottomSheet ошибки CONFLICT
    ///
    /// - Parameters:
    ///   - bottomSheetManager: Менеджер BottomSheet
    ///   - activeTaskId: UUID активной задачи (если есть в ответе сервера)
    ///   - onNavigateToTask: Callback для навигации к активной задаче
    @MainActor
    static func show(
        bottomSheetManager: BottomSheetManager,
        activeTaskId: String?,
        onNavigateToTask: @escaping (String) -> Void
    ) {
        bottomSheetManager.show(showOverlay: true) {
            ActiveTaskConflictBottomSheetContent(
                activeTaskId: activeTaskId,
                onNavigateToTask: { taskId in
                    bottomSheetManager.dismiss()
                    onNavigateToTask(taskId)
                },
                onDismiss: {
                    bottomSheetManager.dismiss()
                }
            )
        }
    }
}

// MARK: - Content

private struct ActiveTaskConflictBottomSheetContent: View {
    @Environment(\.wfmColors) private var colors
    let activeTaskId: String?
    let onNavigateToTask: (String) -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: WFMSpacing.s) {
            // Заголовок
            Text("Вы не можете выполнять две задачи одновременно")
                .font(WFMTypography.headline20Bold)
                .foregroundColor(colors.textPrimary)
                .multilineTextAlignment(.center)

            // Описание
            Text("Чтобы начать эту задачу, завершите или приостановите текущую.")
                .font(WFMTypography.body16Regular)
                .foregroundColor(colors.textPrimary)
                .multilineTextAlignment(.center)

            Spacer().frame(height: WFMSpacing.s)

            // Кнопки — зависит от наличия activeTaskId
            if let activeTaskId = activeTaskId {
                WFMPrimaryButton(text: "Перейти к текущей задаче") {
                    onNavigateToTask(activeTaskId)
                }

                WFMLinkButton(text: "Отмена", size: .big) {
                    onDismiss()
                }
            } else {
                WFMPrimaryButton(text: "Понятно") {
                    onDismiss()
                }
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .padding(.horizontal, WFMSpacing.xl)
        .padding(.vertical, WFMSpacing.l)
    }
}

// MARK: - Preview

private struct ActiveTaskConflictBottomSheetPreview: View {
    @StateObject private var bottomSheetManager = BottomSheetManager()
    @Environment(\.wfmColors) private var colors

    var body: some View {
        VStack(spacing: 16) {
            Button("CONFLICT с активной задачей") {
                ActiveTaskConflictBottomSheet.show(
                    bottomSheetManager: bottomSheetManager,
                    activeTaskId: "2715499b-d174-43ab-a8c4-ffc078f02f3d",
                    onNavigateToTask: { taskId in
                        print("Navigate to task: \(taskId)")
                    }
                )
            }

            Button("CONFLICT без UUID") {
                ActiveTaskConflictBottomSheet.show(
                    bottomSheetManager: bottomSheetManager,
                    activeTaskId: nil,
                    onNavigateToTask: { _ in }
                )
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

#Preview {
    ActiveTaskConflictBottomSheetPreview()
        .wfmTheme()
}
