import SwiftUI
import WFMUI

/// Модель элемента фильтра для UI
struct TaskFilterItem: Identifiable, Equatable {
    let id: String
    let title: String
    var isSelected: Bool
    var isEnabled: Bool = true
}

/// Группа фильтров для UI
struct TaskFilterGroup: Identifiable, Equatable {
    let id: String
    let title: String
    var items: [TaskFilterItem]
}

private let filterChipThreshold = 10

/// BottomSheet фильтров задач (тип работ, сотрудники, зоны)
///
/// Использование:
/// ```swift
/// @EnvironmentObject private var container: DependencyContainer
///
/// Button("Фильтры") {
///     TaskFiltersBottomSheet.show(
///         bottomSheetManager: container.bottomSheetManager,
///         filterGroups: viewModel.filterGroups,
///         onApply: { groups in viewModel.applyFilters(groups) }
///     )
/// }
/// ```
struct TaskFiltersBottomSheet {
    /// Показать BottomSheet фильтров задач
    @MainActor
    static func show(
        bottomSheetManager: BottomSheetManager,
        filterGroups: [TaskFilterGroup],
        taskFilterIndices: [[Int]] = [],
        onApply: @escaping ([TaskFilterGroup]) -> Void
    ) {
        bottomSheetManager.show(showOverlay: true) {
            TaskFiltersBSContent(
                initialGroups: filterGroups,
                taskFilterIndices: taskFilterIndices,
                onApply: onApply,
                onDismiss: { bottomSheetManager.dismiss() }
            )
        }
    }
}

// MARK: - State Wrapper

/// Обёртка с внутренним @State для показа через bottomSheetManager (AnyView не поддерживает внешние @Binding)
private struct TaskFiltersBSContent: View {
    @State private var filterGroups: [TaskFilterGroup]
    let taskFilterIndices: [[Int]]
    let onApply: ([TaskFilterGroup]) -> Void
    let onDismiss: () -> Void

    init(initialGroups: [TaskFilterGroup], taskFilterIndices: [[Int]], onApply: @escaping ([TaskFilterGroup]) -> Void, onDismiss: @escaping () -> Void) {
        _filterGroups = State(initialValue: initialGroups)
        self.taskFilterIndices = taskFilterIndices
        self.onApply = onApply
        self.onDismiss = onDismiss
    }

    var body: some View {
        TaskFiltersBottomSheetContent(
            filterGroups: $filterGroups,
            taskFilterIndices: taskFilterIndices,
            onApply: onApply,
            onDismiss: onDismiss
        )
    }
}

// MARK: - Content

/// Контент BottomSheet фильтров задач
struct TaskFiltersBottomSheetContent: View {
    @Environment(\.wfmColors) private var colors

    @Binding var filterGroups: [TaskFilterGroup]
    let taskFilterIndices: [[Int]]
    let onApply: ([TaskFilterGroup]) -> Void
    let onDismiss: () -> Void

    @State private var expandedGroupId: String? = nil

    private var hasAnySelected: Bool {
        filterGroups.contains { $0.items.contains { $0.isSelected } }
    }

    /// Количество задач, соответствующих текущему выбору (nil если ничего не выбрано)
    private var matchingTaskCount: Int? {
        guard hasAnySelected, !taskFilterIndices.isEmpty else { return nil }
        let activeSelections: [Int: Set<Int>] = filterGroups.enumerated().reduce(into: [:]) { result, pair in
            let (g, group) = pair
            let selected = Set(group.items.indices.filter { group.items[$0].isSelected })
            if !selected.isEmpty { result[g] = selected }
        }
        return taskFilterIndices.filter { row in
            activeSelections.allSatisfy { g, selSet in g < row.count && selSet.contains(row[g]) }
        }.count
    }

    private var showButtonText: String {
        guard let count = matchingTaskCount else { return "Показать задачи" }
        return "Показать \(count) \(taskCountWord(count))"
    }

    private func taskCountWord(_ count: Int) -> String {
        let mod100 = count % 100
        let mod10 = count % 10
        if (11...14).contains(mod100) { return "задач" }
        switch mod10 {
        case 1: return "задачу"
        case 2, 3, 4: return "задачи"
        default: return "задач"
        }
    }

    private var selectedGroupFilters: [(groupId: String, groupTitle: String)] {
        filterGroups.compactMap { group in
            guard group.items.contains(where: { $0.isSelected }) else { return nil }
            return (group.id, group.title)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Заголовок
            Text("Фильтры")
                .font(WFMTypography.headline20Bold)
                .foregroundStyle(colors.textPrimary)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .padding(.horizontal, WFMSpacing.l)
                .padding(.top, WFMSpacing.m)
                .padding(.bottom, WFMSpacing.s)

            // Секция "Вы выбрали" — показывается если хоть что-то выбрано
            if !selectedGroupFilters.isEmpty {
                selectedTagsSection
                    .padding(.horizontal, WFMSpacing.l)
                    .padding(.bottom, WFMSpacing.m)
            }

            // Аккордеон секций
            VStack(spacing: 0) {
                ForEach(Array(filterGroups.enumerated()), id: \.element.id) { index, group in
                    filterSection(group: group)

                    if index < filterGroups.count - 1 {
                        Divider()
                            .padding(.horizontal, WFMSpacing.l)
                    }
                }
            }

            Divider()

            // Кнопки внизу
            bottomButtons
        }
    }

    // MARK: - Selected Tags

    private var selectedTagsSection: some View {
        VStack(alignment: .leading, spacing: WFMSpacing.s) {
            Text("Вы выбрали")
                .font(WFMTypography.headline16Bold)
                .foregroundStyle(colors.textPrimary)
                .frame(maxWidth: .infinity, minHeight: 40, alignment: .leading)

            FiltersFlowLayout(spacing: WFMSpacing.s) {
                ForEach(selectedGroupFilters, id: \.groupId) { filter in
                    WFMFilterTag(
                        text: filter.groupTitle,
                        onRemove: { deselectAllInGroup(groupId: filter.groupId) }
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Filter Section (аккордеон)

    @ViewBuilder
    private func filterSection(group: TaskFilterGroup) -> some View {
        let isExpanded = expandedGroupId == group.id
        let selectedCount = group.items.filter { $0.isSelected }.count

        VStack(alignment: .leading, spacing: 0) {
            // Заголовок-кнопка аккордеона
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    if isExpanded {
                        expandedGroupId = nil
                    } else {
                        // Пересчитываем enabled перед открытием секции
                        filterGroups = recomputeFilterEnabledState(
                            filterGroups: filterGroups,
                            taskFilterIndices: taskFilterIndices
                        )
                        expandedGroupId = group.id
                    }
                }
            } label: {
                HStack(spacing: WFMSpacing.xxs) {
                    Text(group.title)
                        .font(WFMTypography.headline16Bold)
                        .foregroundStyle(colors.textPrimary)

                    if selectedCount > 0 {
                        WFMBadge(text: "\(selectedCount)", color: .violet)
                    }

                    Spacer()

                    if selectedCount > 0 {
                        Button("Очистить") {
                            deselectAllInGroup(groupId: group.id)
                        }
                        .font(WFMTypography.headline12Medium)
                        .foregroundStyle(colors.buttonLinkTextDefault)
                    }

                    (isExpanded ? WFMIcons.chevronUp : WFMIcons.chevronDown)
                        .resizable()
                        .renderingMode(.template)
                        .foregroundStyle(colors.iconPrimary)
                        .frame(width: 20, height: 20)
                }
                .padding(.horizontal, WFMSpacing.l)
                .padding(.vertical, WFMSpacing.s)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            // Контент: чипы (≤10) или список с чекбоксами (>10)
            if isExpanded {
                if group.items.count <= filterChipThreshold {
                    chipContent(group: group)
                } else {
                    checkboxContent(group: group)
                }
            }
        }
    }

    // Чипы для секций с ≤10 элементами
    private func chipContent(group: TaskFilterGroup) -> some View {
        FiltersFlowLayout(spacing: WFMSpacing.s) {
            ForEach(group.items) { item in
                WFMChip(
                    text: item.title,
                    state: !item.isEnabled ? .disabled : item.isSelected ? .active : .default,
                    onTap: item.isEnabled ? { toggleFilter(groupId: group.id, itemId: item.id) } : nil
                )
            }
        }
        .padding(.horizontal, WFMSpacing.l)
        .padding(.bottom, WFMSpacing.m)
    }

    // Список с чекбоксами для секций с >10 элементами
    private func checkboxContent(group: TaskFilterGroup) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(group.items.enumerated()), id: \.element.id) { index, item in
                WFMSelectionCard(
                    title: item.title,
                    type: .select,
                    isChecked: item.isSelected,
                    showBorder: false,
                    onTap: item.isEnabled ? { toggleFilter(groupId: group.id, itemId: item.id) } : {}
                )
                .opacity(item.isEnabled ? 1 : 0.4)

                if index < group.items.count - 1 {
                    Divider()
                        .padding(.horizontal, WFMSpacing.l)
                }
            }
        }
        .padding(.horizontal, WFMSpacing.l)
        .padding(.bottom, WFMSpacing.m)
    }

    // MARK: - Bottom Buttons

    private var bottomButtons: some View {
        VStack(spacing: WFMSpacing.m) {
            WFMPrimaryButton(
                text: showButtonText,
                action: {
                    onApply(filterGroups)
                    onDismiss()
                }
            )
            .fixedSize(horizontal: false, vertical: true)

            Button("Очистить фильтры") {
                clearAllFilters()
            }
            .font(WFMTypography.headline12Medium)
            .foregroundStyle(
                hasAnySelected
                    ? colors.buttonLinkTextDefault
                    : colors.textBrandDisabled
            )
            .disabled(!hasAnySelected)
        }
        .padding(WFMSpacing.l)
    }

    // MARK: - Actions

    private func toggleFilter(groupId: String, itemId: String) {
        guard let gi = filterGroups.firstIndex(where: { $0.id == groupId }),
              let ii = filterGroups[gi].items.firstIndex(where: { $0.id == itemId }) else { return }
        filterGroups[gi].items[ii].isSelected.toggle()
    }

    private func deselectAllInGroup(groupId: String) {
        guard let gi = filterGroups.firstIndex(where: { $0.id == groupId }) else { return }
        for ii in filterGroups[gi].items.indices {
            filterGroups[gi].items[ii].isSelected = false
        }
    }

    private func clearAllFilters() {
        for gi in filterGroups.indices {
            for ii in filterGroups[gi].items.indices {
                filterGroups[gi].items[ii].isSelected = false
            }
        }
    }
}

// MARK: - Recompute Enabled State

/// Пересчитывает isEnabled для каждого элемента фильтра на основе taskFilterIndices.
/// Для группы G: enabled = индексы, встречающиеся в строках taskFilterIndices,
/// где все остальные группы с активными выборами совпадают.
func recomputeFilterEnabledState(filterGroups: [TaskFilterGroup], taskFilterIndices: [[Int]]) -> [TaskFilterGroup] {
    guard !taskFilterIndices.isEmpty else { return filterGroups }
    var updated = filterGroups
    for g in filterGroups.indices {
        var otherSelections: [Int: Set<Int>] = [:]
        for h in filterGroups.indices where h != g {
            let sel = Set(filterGroups[h].items.indices.filter { filterGroups[h].items[$0].isSelected })
            if !sel.isEmpty { otherSelections[h] = sel }
        }
        guard !otherSelections.isEmpty else {
            for i in updated[g].items.indices { updated[g].items[i].isEnabled = true }
            continue
        }
        var reachable = Set<Int>()
        for row in taskFilterIndices {
            guard row.count > g else { continue }
            guard otherSelections.allSatisfy({ h, selSet in h < row.count && selSet.contains(row[h]) }) else { continue }
            let idx = row[g]
            if idx >= 0 { reachable.insert(idx) }
        }
        for i in updated[g].items.indices { updated[g].items[i].isEnabled = reachable.contains(i) }
    }
    return updated
}

// MARK: - FlowLayout для чипов и тегов

private struct FiltersFlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        FlowResult(in: proposal.replacingUnspecifiedDimensions().width, subviews: subviews, spacing: spacing).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(
                at: CGPoint(x: bounds.minX + result.frames[index].minX, y: bounds.minY + result.frames[index].minY),
                proposal: .unspecified
            )
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var frames: [CGRect] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                if x + size.width > maxWidth, x > 0 {
                    x = 0
                    y += lineHeight + spacing
                    lineHeight = 0
                }
                frames.append(CGRect(x: x, y: y, width: size.width, height: size.height))
                lineHeight = max(lineHeight, size.height)
                x += size.width + spacing
            }
            self.size = CGSize(width: maxWidth, height: y + lineHeight)
        }
    }
}

// MARK: - Preview

private let previewFilterGroups: [TaskFilterGroup] = [
    TaskFilterGroup(
        id: "work_types",
        title: "Тип работ",
        items: [
            TaskFilterItem(id: "1", title: "Менеджерские задачи", isSelected: true),
            TaskFilterItem(id: "2", title: "Касса", isSelected: false),
            TaskFilterItem(id: "3", title: "КСО", isSelected: false),
            TaskFilterItem(id: "4", title: "Переоценка", isSelected: false),
            TaskFilterItem(id: "5", title: "Выкладка", isSelected: false),
            TaskFilterItem(id: "6", title: "Смена ценников", isSelected: false),
            TaskFilterItem(id: "7", title: "Другие работы", isSelected: false)
        ]
    ),
    TaskFilterGroup(
        id: "assignee_ids",
        title: "Сотрудники",
        items: [
            TaskFilterItem(id: "e1", title: "Алябьев А.Г.", isSelected: false),
            TaskFilterItem(id: "e2", title: "Глинка М.И.", isSelected: false),
            TaskFilterItem(id: "e3", title: "Мусоргский М.П.", isSelected: false)
        ]
    ),
    TaskFilterGroup(
        id: "zones",
        title: "Зона",
        items: [
            TaskFilterItem(id: "z1", title: "Алкоголь", isSelected: false),
            TaskFilterItem(id: "z2", title: "Бакалея", isSelected: false),
            TaskFilterItem(id: "z3", title: "Бытовая химия", isSelected: false),
            TaskFilterItem(id: "z4", title: "Бэк офис", isSelected: false),
            TaskFilterItem(id: "z5", title: "Заморозка", isSelected: false),
            TaskFilterItem(id: "z6", title: "ЗОЖ", isSelected: false),
            TaskFilterItem(id: "z7", title: "Молочка", isSelected: false),
            TaskFilterItem(id: "z8", title: "Мясо", isSelected: false),
            TaskFilterItem(id: "z9", title: "Овощи", isSelected: false),
            TaskFilterItem(id: "z10", title: "Рыба", isSelected: false),
            TaskFilterItem(id: "z11", title: "Хлеб", isSelected: false)
        ]
    )
]

private struct TaskFiltersBottomSheetPreview: View {
    @StateObject private var bottomSheetManager = BottomSheetManager()
    @Environment(\.wfmColors) private var colors

    var body: some View {
        VStack {
            Button("Открыть фильтры") {
                TaskFiltersBottomSheet.show(
                    bottomSheetManager: bottomSheetManager,
                    filterGroups: previewFilterGroups,
                    onApply: { groups in print("Applied filters: \(groups.flatMap { $0.items.filter(\.isSelected).map(\.title) })") }
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

#Preview("Task Filters BottomSheet") {
    TaskFiltersBottomSheetPreview()
        .wfmTheme()
}
