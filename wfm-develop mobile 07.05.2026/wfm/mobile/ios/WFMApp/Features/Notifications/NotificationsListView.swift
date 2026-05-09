import SwiftUI
import WFMUI

/// Экран "Уведомления"
///
/// Показывает список уведомлений пользователя.
/// Тап по непрочитанному уведомлению — помечает как прочитанное.
/// Фильтр "Только сегодня" ограничивает список текущим днём.
struct NotificationsListView: View {
    @Environment(\.wfmColors) private var colors
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: NotificationsListViewModel

    init(viewModel: NotificationsListViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Navigation bar
            HStack {
                Button {
                    dismiss()
                } label: {
                    Image("ic-back")
                        .resizable()
                        .renderingMode(.template)
                        .frame(width: 24, height: 24)
                        .foregroundColor(colors.iconPrimary)
                }
                .frame(width: 44, height: 44)

                Text("Уведомления")
                    .wfmHeadline16Bold()
                    .foregroundColor(colors.textPrimary)

                Spacer()
            }
            .padding(.horizontal, 4)
            .background(colors.surfaceBase)
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(colors.borderSecondary),
                alignment: .bottom
            )

            // Фильтр "Только сегодня"
            HStack {
                WFMChip(
                    text: "Только сегодня",
                    state: viewModel.filterTodayOnly ? .active : .default
                ) {
                    viewModel.filterTodayOnly.toggle()
                    _Concurrency.Task { await viewModel.loadNotifications() }
                }

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(colors.surfaceBase)

            // Контент
            if viewModel.isLoading {
                // Loading state (прокручиваемый для PTR)
                ScrollView {
                    HStack {
                        Spacer()
                        WFMLoader()
                            .padding(.top, 40)
                        Spacer()
                    }
                }
                .background(colors.surfaceBase)
            } else if viewModel.notifications.isEmpty {
                // Empty state (прокручиваемый для PTR)
                ScrollView {
                    VStack(spacing: 8) {
                        Spacer(minLength: 60)
                        Text("Нет уведомлений")
                            .wfmHeadline16Bold()
                            .foregroundColor(colors.textPrimary)
                        Text(viewModel.filterTodayOnly ? "Сегодня уведомлений не было" : "Все уведомления будут отображаться здесь")
                            .wfmBody14Regular()
                            .foregroundColor(colors.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                    .frame(maxWidth: .infinity)
                }
                .refreshable {
                    await viewModel.refresh()
                }
                .background(colors.surfaceBase)
            } else {
                // Список уведомлений
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(viewModel.notifications) { item in
                            NotificationRow(item: item) {
                                _Concurrency.Task { await viewModel.markAsRead(id: item.id) }
                            }
                            Rectangle()
                                .fill(colors.borderSecondary)
                                .frame(height: 1)
                                .padding(.leading, 36)
                        }
                    }
                    .background(colors.surfaceBase)
                }
                .refreshable {
                    await viewModel.refresh()
                }
                .background(colors.surfaceBase)
            }
        }
        .background(colors.surfaceBase)
        .task {
            await viewModel.loadNotifications()
        }
    }
}

// MARK: - NotificationRow

/// Ячейка уведомления
///
/// Индикатор непрочитанности — фиолетовая точка слева.
/// Тап по ячейке — помечает уведомление прочитанным.
private struct NotificationRow: View {
    @Environment(\.wfmColors) private var colors

    let item: NotificationItem
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 12) {
                // Индикатор непрочитанности
                Circle()
                    .fill(item.isRead ? Color.clear : WFMPrimitiveColors.brand500)
                    .frame(width: 8, height: 8)
                    .padding(.top, 5)

                // Контент уведомления
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .top) {
                        Text(item.title)
                            .wfmBody14Bold()
                            .foregroundColor(colors.textPrimary)
                            .multilineTextAlignment(.leading)

                        Spacer()

                        Text(item.createdAt.notificationTimeString)
                            .wfmBody12Regular()
                            .foregroundColor(colors.textSecondary)
                    }

                    Text(item.body)
                        .wfmBody14Regular()
                        .foregroundColor(colors.textSecondary)
                        .multilineTextAlignment(.leading)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
        .background(colors.surfaceBase)
    }
}

// MARK: - Date Formatting

private extension Date {
    /// Формат времени для ячейки уведомления: "14:30" (сегодня), "вчера", "12 апр"
    var notificationTimeString: String {
        let calendar = Calendar.current
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")

        if calendar.isDateInToday(self) {
            formatter.dateFormat = "HH:mm"
            return formatter.string(from: self)
        } else if calendar.isDateInYesterday(self) {
            return "вчера"
        } else {
            formatter.dateFormat = "d MMM"
            return formatter.string(from: self)
        }
    }
}
