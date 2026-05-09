import SwiftUI
import WFMUI
import WFMAuth
import Kingfisher

/// Экран "Главная"
struct HomeView: View {
    @Environment(\.wfmColors) var colors
    @Environment(\.switchToTasksTab) var switchToTasksTab
    @EnvironmentObject private var container: DependencyContainer
    @StateObject private var viewModel: HomeViewModel

    init(viewModel: HomeViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Заголовок с профилем (фиксированный)
            ProfileHeaderView(
                greetingName: viewModel.greetingName,
                formattedDate: viewModel.formattedDate,
                avatarUrl: viewModel.avatarUrl
            )
            .background(colors.surfaceBase)
            .overlay(
                Rectangle()
                    .fill(colors.borderSecondary)
                    .frame(height: 1),
                alignment: .bottom
            )

            // Прокручиваемый контент
            ScrollView {
                VStack(spacing: WFMSpacing.l) {
                    // Карточка смены
                    ShiftCardView(
                        state: viewModel.shiftCardState,
                        shift: viewModel.currentShift,
                        positionName: viewModel.positionName,
                        storeName: viewModel.storeName,
                        statusText: viewModel.statusText,
                        isShiftLoading: viewModel.isShiftLoading,
                        planTasks: viewModel.planTasks,
                        isPlanTasksLoading: viewModel.isPlanTasksLoading,
                        onOpenShift: {
                            if viewModel.shiftCardState == .inProgress {
                                // Закрытие смены - подготавливаем данные БШ на основе локальных задач
                                viewModel.prepareCloseShiftBottomSheet()
                                // Показываем BottomSheet для подтверждения
                                CloseShiftBottomSheet.show(
                                    bottomSheetManager: container.bottomSheetManager,
                                    viewModel: viewModel,
                                    onDismiss: {
                                        viewModel.clearCloseShiftMessage()
                                    },
                                    onClose: {
                                        // Делаем запрос с правильным force флагом, БШ закроется автоматически при успехе
                                        viewModel.openShift(force: viewModel.closeShiftForce)
                                    }
                                )
                            } else {
                                // Открытие смены - делаем сразу
                                viewModel.openShift()
                            }
                        },
                        onTakeTask: {
                            viewModel.takeNewTask()
                        },
                        onRefresh: {
                            _Concurrency.Task {
                                await viewModel.refreshData()
                            }
                        }
                    )
                    .padding(.horizontal, WFMSpacing.l)
                    .padding(.top, WFMSpacing.s)
                }
            }
            .background(colors.surfaceBase)
            .refreshable {
                await viewModel.refreshData()
            }
        }
        .background(colors.surfaceBase)
        .task {
            await viewModel.loadData()
        }
        .onChange(of: viewModel.shiftClosedSuccessfully) { success in
            // Закрываем BottomSheet при успешном закрытии смены
            if success {
                container.bottomSheetManager.dismiss()
                viewModel.resetShiftClosedFlag()
            }
        }
        .onChange(of: container.bottomSheetManager.isPresented) { isPresented in
            // При закрытии BottomSheet свайпом/кликом вне зоны очищаем сообщения
            if !isPresented {
                viewModel.clearCloseShiftMessage()
            }
        }
        .onChange(of: viewModel.shiftOpenedSuccessfully) { opened in
            print("🔄 HomeView: shiftOpenedSuccessfully changed to \(opened)")
            if opened {
                print("✅ HomeView: Calling switchToTasksTab")
                switchToTasksTab()
                viewModel.resetShiftOpenedFlag()
            }
        }
    }
}

#Preview {
    let container = DependencyContainer.shared

    HomeView(
        viewModel: HomeViewModel(
            role: .worker,
            userManager: container.userManager,
            toastManager: container.toastManager,
            analyticsService: container.analyticsService
        )
    )
    .wfmTheme()
}
