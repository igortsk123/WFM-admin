package com.beyondviolet.wfm.features.managertasks

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.components.BadgeColor
import com.beyondviolet.wfm.ui.components.WfmBadge
import com.beyondviolet.wfm.ui.components.WfmChip
import com.beyondviolet.wfm.ui.components.WfmChipState
import com.beyondviolet.wfm.ui.components.WfmFilterTag
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.components.WfmSelectionCard
import com.beyondviolet.wfm.ui.components.WfmSelectionCardType
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmStroke
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Модель элемента фильтра для UI
 */
data class TaskFilterItem(
    val id: String,
    val title: String,
    val isSelected: Boolean,
    val isEnabled: Boolean = true
)

/**
 * Группа фильтров для UI
 */
data class TaskFilterGroup(
    val id: String,
    val title: String,
    val items: List<TaskFilterItem>
)

private const val FILTER_CHIP_THRESHOLD = 10

/**
 * Контент BottomSheet фильтров задач (тип работ, сотрудники, зоны)
 *
 * Используется внутри WfmBottomSheet:
 * ```
 * WfmBottomSheet(isVisible = showFilters, onDismiss = { showFilters = false }, showOverlay = true) {
 *     TaskFiltersBottomSheetContent(
 *         filterGroups = filterGroups,
 *         onFilterGroupsChange = { viewModel.updateFilters(it) },
 *         onApply = { viewModel.applyFilters(it) },
 *         onDismiss = { showFilters = false }
 *     )
 * }
 * ```
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TaskFiltersBottomSheetContent(
    filterGroups: List<TaskFilterGroup>,
    taskFilterIndices: List<List<Int>> = emptyList(),
    onFilterGroupsChange: (List<TaskFilterGroup>) -> Unit,
    onApply: (List<TaskFilterGroup>) -> Unit,
    onDismiss: () -> Unit
) {
    val colors = WfmTheme.colors
    var expandedGroupId by remember { mutableStateOf<String?>(null) }

    val hasAnySelected = filterGroups.any { group -> group.items.any { it.isSelected } }
    val selectedGroups = filterGroups.filter { group -> group.items.any { it.isSelected } }

    // Количество задач, соответствующих текущему выбору фильтров
    val matchingTaskCount = remember(filterGroups, taskFilterIndices) {
        if (!hasAnySelected || taskFilterIndices.isEmpty()) return@remember -1
        val activeSelections = filterGroups.mapIndexedNotNull { g, group ->
            val selected = group.items.indices.filter { group.items[it].isSelected }.toSet()
            if (selected.isNotEmpty()) g to selected else null
        }.toMap()
        taskFilterIndices.count { row ->
            activeSelections.all { (g, selSet) -> g < row.size && row[g] in selSet }
        }
    }

    val showButtonText = if (matchingTaskCount >= 0) {
        "Показать ${matchingTaskCount} ${taskCountWord(matchingTaskCount)}"
    } else {
        "Показать задачи"
    }

    Column(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
        // Заголовок
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = WfmSpacing.L)
                .padding(top = WfmSpacing.M, bottom = WfmSpacing.S)
                .height(44.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Text(
                text = "Фильтры",
                style = WfmTypography.Headline20Bold,
                color = colors.textPrimary
            )
        }

        // Секция "Вы выбрали" — показывается если хоть что-то выбрано
        if (selectedGroups.isNotEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = WfmSpacing.L)
                    .padding(bottom = WfmSpacing.M),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(40.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Text(
                        text = "Вы выбрали",
                        style = WfmTypography.Headline16Bold,
                        color = colors.textPrimary
                    )
                }
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S),
                    verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
                ) {
                    selectedGroups.forEach { group ->
                        WfmFilterTag(
                            text = group.title,
                            onRemove = {
                                onFilterGroupsChange(deselectAllInGroup(filterGroups, group.id))
                            }
                        )
                    }
                }
            }
        }

        // Аккордеон секций
        filterGroups.forEachIndexed { index, group ->
            val isExpanded = expandedGroupId == group.id
            val selectedCount = group.items.count { it.isSelected }

            Column(modifier = Modifier.fillMaxWidth()) {
                // Заголовок-кнопка аккордеона
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            if (isExpanded) {
                                expandedGroupId = null
                            } else {
                                // Пересчитываем enabled перед открытием секции
                                onFilterGroupsChange(recomputeFilterEnabledState(filterGroups, taskFilterIndices))
                                expandedGroupId = group.id
                            }
                        }
                        .padding(horizontal = WfmSpacing.L, vertical = WfmSpacing.S),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
                ) {
                    Text(
                        text = group.title,
                        style = WfmTypography.Headline16Bold,
                        color = colors.textPrimary
                    )

                    if (selectedCount > 0) {
                        WfmBadge(text = "$selectedCount", color = BadgeColor.VIOLET)
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    if (selectedCount > 0) {
                        TextButton(
                            onClick = {
                                onFilterGroupsChange(deselectAllInGroup(filterGroups, group.id))
                            },
                            contentPadding = PaddingValues(horizontal = WfmSpacing.XS, vertical = 0.dp)
                        ) {
                            Text(
                                text = "Очистить",
                                style = WfmTypography.Headline12Medium,
                                color = colors.buttonLinkTextDefault
                            )
                        }
                    }

                    Icon(
                        painter = painterResource(id = if (isExpanded) com.beyondviolet.wfm.ui.R.drawable.ic_chevron_up else com.beyondviolet.wfm.ui.R.drawable.ic_chevron_down),
                        contentDescription = null,
                        tint = colors.iconPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }

                // Контент секции: чипы (≤10) или список с чекбоксами (>10)
                AnimatedVisibility(
                    visible = isExpanded,
                    enter = expandVertically(),
                    exit = shrinkVertically()
                ) {
                    if (group.items.size <= FILTER_CHIP_THRESHOLD) {
                        // Чипы
                        FlowRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = WfmSpacing.L)
                                .padding(bottom = WfmSpacing.M),
                            horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S),
                            verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
                        ) {
                            group.items.forEach { item ->
                                WfmChip(
                                    text = item.title,
                                    state = when {
                                        !item.isEnabled -> WfmChipState.DISABLED
                                        item.isSelected -> WfmChipState.ACTIVE
                                        else -> WfmChipState.DEFAULT
                                    },
                                    onClick = if (item.isEnabled) {
                                        { onFilterGroupsChange(toggleFilterItem(filterGroups, group.id, item.id)) }
                                    } else null
                                )
                            }
                        }
                    } else {
                        // Список с чекбоксами
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = WfmSpacing.L)
                                .padding(bottom = WfmSpacing.M)
                                .clip(RoundedCornerShape(WfmRadius.XL))
                                .background(colors.surfaceSecondary)
                                .border(
                                    width = WfmStroke.S,
                                    color = colors.borderSecondary,
                                    shape = RoundedCornerShape(WfmRadius.XL)
                                )
                        ) {
                            group.items.forEachIndexed { itemIndex, item ->
                                androidx.compose.foundation.layout.Box(
                                    modifier = Modifier.graphicsLayer { alpha = if (item.isEnabled) 1f else 0.4f }
                                ) {
                                    WfmSelectionCard(
                                        title = item.title,
                                        type = WfmSelectionCardType.SELECT,
                                        isChecked = item.isSelected,
                                        showBorder = false,
                                        onTap = if (item.isEnabled) {
                                            { onFilterGroupsChange(toggleFilterItem(filterGroups, group.id, item.id)) }
                                        } else {
                                            {}
                                        }
                                    )
                                }
                                if (itemIndex < group.items.lastIndex) {
                                    HorizontalDivider(
                                        modifier = Modifier.padding(horizontal = WfmSpacing.M),
                                        color = colors.borderSecondary
                                    )
                                }
                            }
                        }
                    }
                }

                if (index < filterGroups.lastIndex) {
                    HorizontalDivider(
                        modifier = Modifier.padding(horizontal = WfmSpacing.L),
                        color = colors.borderSecondary
                    )
                }
            }
        }

        HorizontalDivider(color = colors.borderSecondary)

        // Кнопки внизу
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(WfmSpacing.L),
            verticalArrangement = Arrangement.spacedBy(WfmSpacing.M),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            WfmPrimaryButton(
                text = showButtonText,
                onClick = {
                    onApply(filterGroups)
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth()
            )

            TextButton(
                onClick = { onFilterGroupsChange(clearAllFilters(filterGroups)) },
                enabled = hasAnySelected,
                contentPadding = PaddingValues(horizontal = WfmSpacing.S, vertical = WfmSpacing.XXS)
            ) {
                Text(
                    text = "Очистить фильтры",
                    style = WfmTypography.Headline12Medium,
                    color = if (hasAnySelected) {
                        colors.buttonLinkTextDefault
                    } else {
                        colors.textBrandDisabled
                    }
                )
            }
        }
    }
}

// MARK: - Helpers

/**
 * Пересчитывает isEnabled для каждого элемента фильтра на основе taskFilterIndices.
 * Для группы G: enabled = индексы, встречающиеся в строках taskFilterIndices,
 * где все остальные группы с активными выборами совпадают.
 */
fun recomputeFilterEnabledState(
    groups: List<TaskFilterGroup>,
    indices: List<List<Int>>
): List<TaskFilterGroup> {
    if (indices.isEmpty()) return groups
    return groups.mapIndexed { g, group ->
        val otherSelections = groups.indices
            .filter { it != g }
            .mapNotNull { h ->
                val sel = groups[h].items.indices.filter { groups[h].items[it].isSelected }.toSet()
                if (sel.isNotEmpty()) h to sel else null
            }
            .toMap()
        if (otherSelections.isEmpty()) {
            return@mapIndexed group.copy(items = group.items.map { it.copy(isEnabled = true) })
        }
        val reachable = mutableSetOf<Int>()
        for (row in indices) {
            if (row.size <= g) continue
            if (!otherSelections.all { (h, selSet) -> h < row.size && row[h] in selSet }) continue
            val idx = row[g]
            if (idx >= 0) reachable.add(idx)
        }
        group.copy(items = group.items.mapIndexed { i, item -> item.copy(isEnabled = i in reachable) })
    }
}

private fun taskCountWord(count: Int): String {
    val mod100 = count % 100
    val mod10 = count % 10
    return when {
        mod100 in 11..14 -> "задач"
        mod10 == 1 -> "задачу"
        mod10 in 2..4 -> "задачи"
        else -> "задач"
    }
}

private fun toggleFilterItem(
    groups: List<TaskFilterGroup>,
    groupId: String,
    itemId: String
): List<TaskFilterGroup> = groups.map { group ->
    if (group.id != groupId) group
    else group.copy(items = group.items.map { item ->
        if (item.id == itemId) item.copy(isSelected = !item.isSelected) else item
    })
}

private fun deselectAllInGroup(
    groups: List<TaskFilterGroup>,
    groupId: String
): List<TaskFilterGroup> = groups.map { group ->
    if (group.id != groupId) group
    else group.copy(items = group.items.map { it.copy(isSelected = false) })
}

private fun clearAllFilters(groups: List<TaskFilterGroup>): List<TaskFilterGroup> =
    groups.map { group ->
        group.copy(items = group.items.map { it.copy(isSelected = false) })
    }

// MARK: - Preview

@OptIn(ExperimentalLayoutApi::class)
@Preview(showBackground = true, backgroundColor = 0xFFFFFF)
@Composable
private fun TaskFiltersBottomSheetPreview() {
    WfmTheme {
        val groups = listOf(
            TaskFilterGroup(
                id = "work_types",
                title = "Тип работ",
                items = listOf(
                    TaskFilterItem(id = "1", title = "Менеджерские задачи", isSelected = true),
                    TaskFilterItem(id = "2", title = "Касса", isSelected = false),
                    TaskFilterItem(id = "3", title = "КСО", isSelected = false),
                    TaskFilterItem(id = "4", title = "Переоценка", isSelected = false),
                    TaskFilterItem(id = "5", title = "Выкладка", isSelected = false),
                    TaskFilterItem(id = "6", title = "Смена ценников", isSelected = false),
                    TaskFilterItem(id = "7", title = "Другие работы", isSelected = false)
                )
            ),
            TaskFilterGroup(
                id = "employees",
                title = "Сотрудники",
                items = listOf(
                    TaskFilterItem(id = "e1", title = "Алябьев А.Г.", isSelected = false),
                    TaskFilterItem(id = "e2", title = "Глинка М.И.", isSelected = false),
                    TaskFilterItem(id = "e3", title = "Мусоргский М.П.", isSelected = false)
                )
            ),
            TaskFilterGroup(
                id = "zones",
                title = "Зона",
                items = listOf(
                    TaskFilterItem(id = "z1", title = "Алкоголь", isSelected = false),
                    TaskFilterItem(id = "z2", title = "Бакалея", isSelected = false),
                    TaskFilterItem(id = "z3", title = "Бытовая химия", isSelected = false)
                )
            )
        )

        var filterGroups by remember { mutableStateOf(groups) }

        TaskFiltersBottomSheetContent(
            filterGroups = filterGroups,
            onFilterGroupsChange = { filterGroups = it },
            onApply = {},
            onDismiss = {}
        )
    }
}
