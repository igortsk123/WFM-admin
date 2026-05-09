import SwiftUI
import WFMUI
import WFMAuth
import Kingfisher

/// Экран "Настройки" (Профиль пользователя)
///
/// Отображает информацию о текущем пользователе:
/// - Аватар
/// - ФИО
/// - Должность (badge)
/// - Кнопка "Выйти"
/// - Версия приложения
struct SettingsView: View {
    @Environment(\.wfmColors) private var colors
    @EnvironmentObject private var router: AppRouter
    @EnvironmentObject private var container: DependencyContainer
    @StateObject private var viewModel: SettingsViewModel
    @State private var showNotificationsList = false
    @State private var showAssignmentsList = false
    @State private var showSupportScreen = false
    @State private var showDeleteAccountScreen = false
    @State private var showImpersonationDialog = false
    @State private var impersonationPhoneInput = ""

    init(viewModel: SettingsViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.1"
    }

    var body: some View {
        VStack(spacing: 0) {
            // Профиль пользователя (фиксированный, не двигается при pull-to-refresh)
            if let user = viewModel.currentUser {
                ProfileSection(
                    avatarUrl: user.photoUrl,
                    fullName: user.fullName,
                    positionName: viewModel.currentAssignment?.position?.name
                )
            } else {
                ProgressView()
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(colors.surfaceBase)
                    .overlay(
                        Rectangle()
                            .frame(height: 1)
                            .foregroundColor(colors.borderSecondary),
                        alignment: .bottom
                    )
            }

            // Прокручиваемый контент с pull-to-refresh
            GeometryReader { geometry in
                ScrollView {
                    VStack(spacing: 12) {
                        // Кнопка "Уведомления" — временно скрыта (план приостановлен)
                        // TODO: раскрыть после завершения плана notifications_list

                        // Кнопка "Назначения" (показывается только если назначений > 1)
                        if viewModel.shouldShowAssignmentsButton {
                            VStack(spacing: 0) {
                                Button {
                                    showAssignmentsList = true
                                } label: {
                                    HStack(spacing: 8) {
                                        Text("Назначения")
                                            .wfmHeadline14Medium()
                                            .foregroundColor(colors.textPrimary)

                                        Spacer()
                                        
                                        WFMIcons.chevronRight
                                            .resizable()
                                            .frame(width: 16, height: 16)
                                            .foregroundColor(colors.iconPrimary)
                                    }
                                    .padding(12)
                                    .frame(height: 44)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(PlainButtonStyle())
                                .background(colors.surfaceSecondary)
                                .overlay(
                                    RoundedRectangle(cornerRadius: WFMRadius.l)
                                        .stroke(colors.borderSecondary, lineWidth: 1)
                                )
                                .cornerRadius(WFMRadius.l)
                                .padding(.horizontal, 16)
                            }
                            .frame(maxWidth: .infinity, alignment: .topLeading)
                        }

                        // Кнопка "Войти как" (только для разработчиков с flags.dev в JWT)
                        if !viewModel.isDevUser {
                            VStack(alignment: .leading, spacing: 4) {
                                Button {
                                    impersonationPhoneInput = viewModel.impersonationPhone ?? ""
                                    showImpersonationDialog = true
                                } label: {
                                    HStack(spacing: 8) {
                                        Text("Войти как")
                                            .wfmHeadline14Medium()
                                            .foregroundColor(colors.textPrimary)

                                        Spacer()

                                        Image("ic-tab-profile")
                                            .resizable()
                                            .frame(width: 16, height: 16)
                                            .foregroundColor(colors.iconPrimary)
                                    }
                                    .padding(12)
                                    .frame(height: 44)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(PlainButtonStyle())
                                .background(colors.surfaceSecondary)
                                .overlay(
                                    RoundedRectangle(cornerRadius: WFMRadius.l)
                                        .stroke(colors.borderSecondary, lineWidth: 1)
                                )
                                .cornerRadius(WFMRadius.l)
                                .padding(.horizontal, 16)

                                if let phone = viewModel.impersonationPhone {
                                    Text("Активно: \(phone)")
                                        .wfmBody14Regular()
                                        .foregroundColor(colors.textSecondary)
                                        .padding(EdgeInsets(top: 0, leading: 28, bottom: 0, trailing: 28))
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .topLeading)
                        }

                        // Кнопка "Поддержка"
                        VStack(spacing: 0) {
                            Button {
                                showSupportScreen = true
                            } label: {
                                HStack(spacing: 8) {
                                    Text("Поддержка")
                                        .wfmHeadline14Medium()
                                        .foregroundColor(colors.textPrimary)

                                    Spacer()

                                    WFMIcons.chevronRight
                                        .resizable()
                                        .frame(width: 16, height: 16)
                                        .foregroundColor(colors.iconPrimary)
                                }
                                .padding(12)
                                .frame(height: 44)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(PlainButtonStyle())
                            .background(colors.surfaceSecondary)
                            .overlay(
                                RoundedRectangle(cornerRadius: WFMRadius.l)
                                    .stroke(colors.borderSecondary, lineWidth: 1)
                            )
                            .cornerRadius(WFMRadius.l)
                            .padding(.horizontal, 16)
                        }
                        .frame(maxWidth: .infinity, alignment: .topLeading)

                        // Кнопка "Поделиться приложением"
                        VStack(spacing: 0) {
                            Button {
                                ShareAppBottomSheet.show(bottomSheetManager: container.bottomSheetManager)
                            } label: {
                                HStack(spacing: 8) {
                                    Text("Поделиться приложением")
                                        .wfmHeadline14Medium()
                                        .foregroundColor(colors.textPrimary)

                                    Spacer()

                                    Image("ic-qr")
                                        .resizable()
                                        .frame(width: 16, height: 16)
                                        .foregroundColor(colors.iconPrimary)
                                }
                                .padding(12)
                                .frame(height: 44)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(PlainButtonStyle())
                            .background(colors.surfaceSecondary)
                            .overlay(
                                RoundedRectangle(cornerRadius: WFMRadius.l)
                                    .stroke(colors.borderSecondary, lineWidth: 1)
                            )
                            .cornerRadius(WFMRadius.l)
                            .padding(.horizontal, 16)
                        }
                        .frame(maxWidth: .infinity, alignment: .topLeading)

                        // Кнопка "Удалить учётную запись"
                        VStack(spacing: 0) {
                            Button {
                                showDeleteAccountScreen = true
                            } label: {
                                HStack(spacing: 8) {
                                    Text("Удалить учётную запись")
                                        .wfmHeadline14Medium()
                                        .foregroundColor(colors.textError)

                                    Spacer()

                                    Image("ic-tab-profile")
                                        .resizable()
                                        .frame(width: 16, height: 16)
                                        .foregroundColor(colors.textError)
                                }
                                .padding(12)
                                .frame(height: 44)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(PlainButtonStyle())
                            .background(colors.surfaceSecondary)
                            .overlay(
                                RoundedRectangle(cornerRadius: WFMRadius.l)
                                    .stroke(colors.borderSecondary, lineWidth: 1)
                            )
                            .cornerRadius(WFMRadius.l)
                            .padding(.horizontal, 16)
                        }
                        .frame(maxWidth: .infinity, alignment: .topLeading)

                        // Кнопка "Выйти"
                        VStack(spacing: 0) {
                            Button {
                                LogoutBottomSheet.show(bottomSheetManager: container.bottomSheetManager) {
                                    _Concurrency.Task {
                                        await router.logout()
                                    }
                                }
                            } label: {
                                HStack(spacing: 8) {
                                    Text("Выйти")
                                        .wfmHeadline14Medium()
                                        .foregroundColor(colors.textPrimary)

                                    Spacer()

                                    Image("ic-signout")
                                        .resizable()
                                        .renderingMode(.template)
                                        .frame(width: 16, height: 16)
                                        .foregroundColor(colors.iconPrimary)
                                }
                                .padding(12)
                                .frame(height: 44)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(PlainButtonStyle())
                            .background(colors.surfaceSecondary)
                            .overlay(
                                RoundedRectangle(cornerRadius: WFMRadius.l)
                                    .stroke(colors.borderSecondary, lineWidth: 1)
                            )
                            .cornerRadius(WFMRadius.l)
                            .padding(.horizontal, 16)

                            Spacer()
                        }
                        .frame(maxWidth: .infinity, alignment: .topLeading)

                        // Версия приложения (внизу)
                        Text("Версия приложения \(appVersion)")
                            .wfmHeadline14Medium()
                            .foregroundColor(colors.textSecondary)
                            .frame(maxWidth: .infinity)
                    }
                    .padding(.vertical, 12)
                    .frame(minHeight: geometry.size.height)
                }
                .refreshable {
                    await viewModel.refresh()
                }
            }
            .background(colors.surfaceBase)
        }
        .background(colors.surfaceBase)
        .task {
            await viewModel.loadUser()
        }
        .alert("Войти как", isPresented: $showImpersonationDialog) {
            TextField("Номер телефона", text: $impersonationPhoneInput)
                .keyboardType(.phonePad)
            Button("Готово") {
                viewModel.setImpersonationPhone(impersonationPhoneInput)
            }
            if viewModel.impersonationPhone != nil {
                Button("Очистить", role: .destructive) {
                    viewModel.setImpersonationPhone(nil)
                }
            }
            Button("Отмена", role: .cancel) {}
        } message: {
            Text("Введите номер телефона пользователя")
        }
        .fullScreenCover(isPresented: $showNotificationsList) {
            NotificationsListView(
                viewModel: container.makeNotificationsListViewModel()
            )
            .wfmTheme()
        }
        .fullScreenCover(isPresented: $showSupportScreen) {
            SupportView()
        }
        .fullScreenCover(isPresented: $showDeleteAccountScreen) {
            DeleteAccountView(
                viewModel: viewModel,
                onSuccess: {
                    showDeleteAccountScreen = false
                    _Concurrency.Task { await router.logout() }
                }
            )
            .wfmTheme()
        }
        .fullScreenCover(isPresented: $showAssignmentsList) {
            if let user = viewModel.currentUser {
                AssignmentsListView(
                    assignments: user.assignments,
                    selectedAssignmentId: viewModel.currentAssignment?.id,
                    onSelectAssignment: { assignment in
                        _Concurrency.Task {
                            await viewModel.switchAssignment(assignmentId: assignment.id)
                            showAssignmentsList = false
                        }
                    }
                )
            }
        }
    }
}

// MARK: - Profile Section

/// Секция профиля пользователя
///
/// - Parameters:
///   - avatarUrl: URL аватара (если nil — показываем заглушку)
///   - fullName: ФИО пользователя
///   - positionName: Название должности (если nil — не показываем badge)
private struct ProfileSection: View {
    @Environment(\.wfmColors) private var colors

    let avatarUrl: String?
    let fullName: String
    let positionName: String?

    var body: some View {
        HStack(spacing: 8) {
            // Аватар
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

            // ФИО и должность
            VStack(alignment: .leading, spacing: 4) {
                Text(fullName)
                    .wfmBody14Bold()
                    .foregroundColor(colors.textPrimary)

                // Badge с должностью (если назначена)
                if let position = positionName {
                    WFMBadge(text: position, color: .violet)
                }
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(colors.surfaceBase)
        .overlay(
            Rectangle()
                .frame(height: 1)
                .foregroundColor(colors.borderSecondary),
            alignment: .bottom
        )
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(WFMPrimitiveColors.neutral400)
            .frame(width: 40, height: 40)
            .overlay(
                WFMIcons.person
                    .resizable()
                    .renderingMode(.template)
                    .foregroundColor(colors.iconEmpty)
                    .frame(width: 20, height: 20)
            )
    }
}

// MARK: - Preview

#Preview {
    let container = DependencyContainer.shared
    SettingsView(
        viewModel: container.makeSettingsViewModel()
    )
    .environmentObject(AppRouter(
        tokenStorage: container.tokenStorage,
        userManager: container.userManager,
        impersonationStorage: container.impersonationStorage
    ))
    .wfmTheme()
}
