package com.beyondviolet.wfm.features.settings

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.core.models.Assignment
import com.beyondviolet.wfm.core.models.Position
import com.beyondviolet.wfm.core.models.Rank
import com.beyondviolet.wfm.core.models.Role
import com.beyondviolet.wfm.core.models.Store
import com.beyondviolet.wfm.core.models.badgeColor
import kotlinx.datetime.Clock
import com.beyondviolet.wfm.ui.theme.WFMAppTheme
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*
import com.beyondviolet.wfm.ui.components.WfmBadge
import com.beyondviolet.wfm.ui.components.WfmRadioButton
import com.beyondviolet.wfm.core.utils.rememberDebouncedClick

/**
 * Экран списка назначений пользователя
 *
 * Отображает список всех назначений с выбором через радиокнопку
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssignmentsListScreen(
    assignments: List<Assignment>,
    selectedAssignmentId: Int?,
    onDismiss: () -> Unit,
    onSelectAssignment: (Assignment) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    var selectedId by remember { mutableStateOf(selectedAssignmentId) }
    val view = LocalView.current

    // Debounce для кнопки назад - предотвращаем множественные dismiss
    val (backButtonEnabled, debouncedDismiss) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = onDismiss
    )

    // Устанавливаем цвет navigation bar и восстанавливаем при уходе с экрана
    DisposableEffect(Unit) {
        val window = (view.context as? android.app.Activity)?.window
        val originalNavigationBarColor = window?.navigationBarColor
        val insetsController = window?.let { WindowCompat.getInsetsController(it, view) }
        val originalAppearanceLightNavigationBars = insetsController?.isAppearanceLightNavigationBars

        // Установить цвет navigation bar для текущего экрана
        window?.let {
            insetsController?.isAppearanceLightNavigationBars = true
            it.navigationBarColor = colors.surfaceBase.toArgb()
        }

        onDispose {
            // Восстановить исходный цвет при уходе с экрана
            window?.let {
                originalNavigationBarColor?.let { color -> it.navigationBarColor = color }
                originalAppearanceLightNavigationBars?.let { appearance ->
                    insetsController?.isAppearanceLightNavigationBars = appearance
                }
            }
        }
    }

    // Обработка системной кнопки "Назад"
    BackHandler {
        onDismiss()
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.surfaceBase)
    ) {
        // Заголовок с кнопкой назад
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = colors.surfaceBase
        ) {
            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .padding(horizontal = WfmSpacing.M, vertical = WfmSpacing.XXS),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Кнопка назад
                    IconButton(
                        onClick = debouncedDismiss,
                        enabled = backButtonEnabled,
                        modifier = Modifier.size(44.dp)
                    ) {
                        Icon(
                            painter = painterResource(id = com.beyondviolet.wfm.ui.R.drawable.ic_back),
                            contentDescription = "Назад",
                            tint = colors.iconPrimary,
                            modifier = Modifier.size(44.dp)
                        )
                    }

                    // Заголовок
                    Text(
                        text = "Выберите должность",
                        style = WfmTypography.Headline16Bold,
                        color = colors.textPrimary,
                        modifier = Modifier.padding(start = 0.dp)
                    )
                }

                HorizontalDivider(
                    thickness = 1.dp,
                    color = colors.barsBorder
                )
            }
        }

        // Список назначений
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(WfmSpacing.L),
            verticalArrangement = Arrangement.spacedBy(WfmSpacing.M)
        ) {
            items(assignments) { assignment ->
                AssignmentRow(
                    assignment = assignment,
                    isSelected = selectedId == assignment.id,
                    onClick = {
                        selectedId = assignment.id
                        onSelectAssignment(assignment)
                    }
                )
            }
        }
    }
}

/**
 * Ячейка с информацией о назначении
 */
@Composable
private fun AssignmentRow(
    assignment: Assignment,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .border(
                width = 1.dp,
                color = colors.cardBorderSecondary,
                shape = RoundedCornerShape(WfmRadius.L)
            ),
        shape = RoundedCornerShape(WfmRadius.L),
        color = colors.surfaceSecondary,
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(WfmSpacing.M),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            // Контент: Badge + адрес магазина
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.M)
            ) {
                // Badge с должностью
                assignment.position?.name?.let { positionName ->
                    WfmBadge(
                        text = positionName,
                        color = assignment.badgeColor()
                    )
                }

                // Адрес магазина с иконкой pin
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_pin_filled),
                        contentDescription = null,
                        tint = Color.Unspecified,
                        modifier = Modifier.size(12.dp)
                    )

                    val locationText = assignment.store?.address
                        ?: assignment.store?.name
                        ?: ""

                    Text(
                        text = locationText,
                        style = WfmTypography.Headline12Medium,
                        color = colors.cardTextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.width(WfmSpacing.M))

            // Радиокнопка
            WfmRadioButton(isSelected = isSelected)
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// PREVIEW
// ─────────────────────────────────────────────────────────────────

@Preview(name = "Assignments List Screen - Light", showBackground = true)
@Composable
private fun AssignmentsListScreenPreview() {
    WFMAppTheme(darkTheme = false) {
        AssignmentsListScreen(
            assignments = listOf(
                Assignment(
                    id = 1,
                    externalId = 123,
                    companyName = "Компания 1",
                    position = Position(
                        id = 1,
                        code = "seller",
                        name = "Продавец-универсал",
                        description = null,
                        role = Role(
                            id = 1,
                            code = "worker",
                            name = "Работник",
                            description = null
                        )
                    ),
                    rank = Rank(
                        id = 3,
                        code = "rank_3",
                        name = "Разряд 3"
                    ),
                    store = Store(
                        id = 1,
                        name = "Магазин на Некрасова 41",
                        address = "С-12 Некрасова, 41 (ИР)",
                        createdAt = Clock.System.now()
                    ),
                    dateStart = "2025-01-01",
                    dateEnd = null
                ),
                Assignment(
                    id = 2,
                    externalId = 124,
                    companyName = "Компания 1",
                    position = Position(
                        id = 2,
                        code = "cashier",
                        name = "Кассир",
                        description = null,
                        role = Role(
                            id = 1,
                            code = "worker",
                            name = "Работник",
                            description = null
                        )
                    ),
                    rank = null,
                    store = Store(
                        id = 2,
                        name = "Магазин на Учебной 37",
                        address = "С-17 Учебная 37, 41 (ИР)",
                        createdAt = Clock.System.now()
                    ),
                    dateStart = "2025-02-01",
                    dateEnd = null
                )
            ),
            selectedAssignmentId = 1,
            onDismiss = {},
            onSelectAssignment = {}
        )
    }
}

@Preview(name = "Assignment Row - Light", showBackground = true)
@Composable
private fun AssignmentRowPreview() {
    WFMAppTheme(darkTheme = false) {
        AssignmentRow(
            assignment = Assignment(
                id = 1,
                externalId = 123,
                companyName = "Компания 1",
                position = Position(
                    id = 1,
                    code = "seller",
                    name = "Продавец-универсал",
                    description = null,
                    role = Role(
                        id = 1,
                        code = "worker",
                        name = "Работник",
                        description = null
                    )
                ),
                rank = Rank(
                    id = 3,
                    code = "rank_3",
                    name = "Разряд 3"
                ),
                store = Store(
                    id = 1,
                    name = "Магазин на Некрасова 41",
                    address = "С-12 Некрасова, 41 (ИР)",
                    createdAt = Clock.System.now()
                ),
                dateStart = "2025-01-01",
                dateEnd = null
            ),
            isSelected = true,
            onClick = {}
        )
    }
}
