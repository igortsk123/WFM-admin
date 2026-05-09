import SwiftUI
import WFMUI

struct SelectOperationsBottomSheet: View {
    let operations: [Operation]
    let onConfirm: (Set<Int>) -> Void
    let onCreateNew: () -> Void
    let onSearchUsed: () -> Void

    @Environment(\.wfmColors) private var colors
    @State private var tempSelected: Set<Int>
    @State private var searchText = ""
    @State private var hasTrackedSearch = false
    @State private var keyboardHeight: CGFloat = 0
    @State private var isPendingExpanded = false
    @FocusState private var isSearchFocused: Bool

    init(
        operations: [Operation],
        initiallySelected: Set<Int>,
        onConfirm: @escaping (Set<Int>) -> Void,
        onCreateNew: @escaping () -> Void,
        onSearchUsed: @escaping () -> Void = {}
    ) {
        self.operations = operations
        self.onConfirm = onConfirm
        self.onCreateNew = onCreateNew
        self.onSearchUsed = onSearchUsed
        _tempSelected = State(initialValue: initiallySelected)
    }

    private var filteredOperations: [Operation] {
        guard !searchText.isEmpty else { return operations }
        return operations.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    private var acceptedOperations: [Operation] {
        filteredOperations.filter { $0.reviewState != .pending }
    }

    private var pendingOperations: [Operation] {
        filteredOperations.filter { $0.reviewState == .pending }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .center) {
                Text("Выберите подзадачу")
                    .font(WFMTypography.headline18Bold)
                    .foregroundColor(colors.textPrimary)
                Spacer()
                Button("Создать новую", action: onCreateNew)
                    .font(WFMTypography.headline12Medium)
                    .foregroundColor(colors.textBrand)
                    .buttonStyle(PlainButtonStyle())
            }
            .padding(WFMSpacing.l)

            // Search field
            searchField
                .padding(.horizontal, WFMSpacing.l)
                .padding(.bottom, WFMSpacing.l)
                .onChange(of: searchText) { newValue in
                    if !hasTrackedSearch && !newValue.isEmpty {
                        hasTrackedSearch = true
                        onSearchUsed()
                    }
                }

            // Список или пустое состояние
            if filteredOperations.isEmpty && !searchText.isEmpty {
                Text("Мы не нашли такую подзадачу. Проверьте текст запроса или добавьте новую.")
                    .font(WFMTypography.body14Regular)
                    .foregroundColor(colors.inputCaption)
                    .padding(.horizontal, WFMSpacing.l)
                    .padding(.bottom, WFMSpacing.l)
            } else {
                VStack(spacing: WFMSpacing.s) {
                    // Подтверждённые (ACCEPTED / без статуса)
                    ForEach(acceptedOperations) { operation in
                        WFMSelectionCard(
                            title: operation.name,
                            type: .select,
                            isChecked: tempSelected.contains(operation.id),
                            showBorder: false,
                            verticalPadding: WFMSpacing.s,
                            onTap: { toggleTemp(operation.id) }
                        )
                        .padding(.horizontal, WFMSpacing.l)
                    }

                    // Коллапсируемая секция "Не подтверждённые" (PENDING)
                    if !pendingOperations.isEmpty {
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                isPendingExpanded.toggle()
                            }
                        } label: {
                            HStack(spacing: WFMSpacing.s) {
                                Text("Не подтверждённые")
                                    .font(WFMTypography.headline16Bold)
                                    .foregroundColor(colors.textPrimary)
                                Spacer()
                                (isPendingExpanded ? WFMIcons.chevronUp : WFMIcons.chevronDown)
                                    .foregroundColor(colors.iconPrimary)
                            }
                            .padding(.horizontal, WFMSpacing.l)
                            .padding(.vertical, WFMSpacing.s)
                        }
                        .buttonStyle(PlainButtonStyle())

                        if isPendingExpanded {
                            ForEach(pendingOperations) { operation in
                                WFMSelectionCard(
                                    title: operation.name,
                                    type: .select,
                                    isChecked: tempSelected.contains(operation.id),
                                    showBorder: false,
                                    onTap: { toggleTemp(operation.id) }
                                )
                                .padding(.horizontal, WFMSpacing.l)
                            }
                        }
                    }
                }
                Spacer().frame(height: WFMSpacing.l)
            }

            // Кнопка Готово
            WFMPrimaryButton(
                text: tempSelected.isEmpty ? "Готово" : "Готово (\(tempSelected.count))",
                isEnabled: !tempSelected.isEmpty
            ) {
                onConfirm(tempSelected)
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, WFMSpacing.l)
            .padding(.bottom, keyboardHeight > 0 ? keyboardHeight - (UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first?.windows.first?.safeAreaInsets.bottom ?? 0) : WFMSpacing.l)
            .animation(.easeOut(duration: 0.25), value: keyboardHeight)
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { notification in
                if let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect {
                    keyboardHeight = frame.height
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
                keyboardHeight = 0
            }
        }
    }

    @ViewBuilder
    private var searchField: some View {
        HStack(spacing: WFMSpacing.s) {
            HStack(spacing: WFMSpacing.s) {
                TextField("Поиск подзадачи", text: $searchText)
                    .font(WFMTypography.body14Regular)
                    .foregroundColor(colors.textPrimary)
                    .focused($isSearchFocused)
                    .autocorrectionDisabled()

                if !searchText.isEmpty {
                    Button {
                        searchText = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .resizable()
                            .frame(width: 16, height: 16)
                            .foregroundColor(colors.textTertiary)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(WFMSpacing.m)
            .background(colors.surfacePrimary)
            .cornerRadius(WFMRadius.l)
            .overlay(
                RoundedRectangle(cornerRadius: WFMRadius.l)
                    .stroke(colors.borderSecondary, lineWidth: 1)
            )

            if isSearchFocused {
                Button("Отмена") {
                    searchText = ""
                    isSearchFocused = false
                }
                .font(WFMTypography.headline12Medium)
                .foregroundColor(colors.textPrimary)
                .buttonStyle(PlainButtonStyle())
                .transition(.move(edge: .trailing).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: isSearchFocused)
    }

    private func toggleTemp(_ id: Int) {
        if tempSelected.contains(id) {
            tempSelected.remove(id)
        } else {
            tempSelected.insert(id)
        }
    }

    static func show(
        bottomSheetManager: BottomSheetManager,
        operations: [Operation],
        initiallySelected: Set<Int>,
        onConfirm: @escaping (Set<Int>) -> Void,
        onCreateNew: @escaping () -> Void,
        onSearchUsed: @escaping () -> Void = {}
    ) {
        bottomSheetManager.show(showOverlay: true) {
            SelectOperationsBottomSheet(
                operations: operations,
                initiallySelected: initiallySelected,
                onConfirm: onConfirm,
                onCreateNew: onCreateNew,
                onSearchUsed: onSearchUsed
            )
        }
    }
}
