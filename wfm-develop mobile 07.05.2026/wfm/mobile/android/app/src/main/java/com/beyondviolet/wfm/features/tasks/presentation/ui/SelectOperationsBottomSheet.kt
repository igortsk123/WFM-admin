package com.beyondviolet.wfm.features.tasks.presentation.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.material3.Icon
import com.beyondviolet.wfm.core.models.Operation
import com.beyondviolet.wfm.core.models.OperationReviewState
import com.beyondviolet.wfm.ui.components.WfmBottomSheet
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.components.WfmSelectionCard
import com.beyondviolet.wfm.ui.components.WfmSelectionCardType
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.borderSecondary
import com.beyondviolet.wfm.ui.theme.iconPrimary
import com.beyondviolet.wfm.ui.theme.iconSecondary
import com.beyondviolet.wfm.ui.theme.surfacePrimary
import com.beyondviolet.wfm.ui.theme.textBrand
import com.beyondviolet.wfm.ui.theme.textPrimary
import com.beyondviolet.wfm.ui.theme.textTertiary
import com.beyondviolet.wfm.ui.theme.inputCaption

/**
 * Bottom Sheet для выбора подзадач из существующего списка.
 *
 * Дизайн: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=4980-49591
 *
 * @param isVisible Показать или скрыть BottomSheet
 * @param operations Полный список доступных операций
 * @param initiallySelected Уже выбранные ID операций
 * @param onConfirm Callback с выбранными ID при нажатии "Готово"
 * @param onCreateNew Callback при нажатии "Создать новую" — для перехода к BS2
 * @param onDismiss Callback при закрытии BottomSheet
 */
@Composable
fun SelectOperationsBottomSheet(
    isVisible: Boolean,
    operations: List<Operation>,
    initiallySelected: Set<Int>,
    onConfirm: (Set<Int>) -> Unit,
    onCreateNew: () -> Unit,
    onDismiss: () -> Unit,
    onSearchUsed: () -> Unit = {}
) {
    var tempSelected by remember(isVisible) { mutableStateOf(initiallySelected) }
    var searchQuery by remember(isVisible) { mutableStateOf(TextFieldValue("")) }
    var hasTrackedSearch by remember(isVisible) { mutableStateOf(false) }
    var isSearchFocused by remember { mutableStateOf(false) }
    var isPendingExpanded by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    val colors = WfmTheme.colors

    val filteredOperations = remember(operations, searchQuery.text) {
        if (searchQuery.text.isEmpty()) operations
        else operations.filter { it.name.contains(searchQuery.text, ignoreCase = true) }
    }
    val acceptedOperations = remember(filteredOperations) {
        filteredOperations.filter { it.reviewState != OperationReviewState.PENDING }
    }
    val pendingOperations = remember(filteredOperations) {
        filteredOperations.filter { it.reviewState == OperationReviewState.PENDING }
    }

    WfmBottomSheet(
        isVisible = isVisible,
        onDismiss = onDismiss,
        showOverlay = true
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(vertical = WfmSpacing.L)
        ) {
            // Header: заголовок + "Создать новую"
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = WfmSpacing.L)
                    .padding(bottom = WfmSpacing.M),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Выберите подзадачу",
                    style = WfmTypography.Headline18Bold,
                    color = colors.textPrimary
                )
                Text(
                    text = "Создать новую",
                    style = WfmTypography.Headline12Medium,
                    color = colors.textBrand,
                    modifier = Modifier
                        .padding(vertical = WfmSpacing.XXS)
                        .clickable(onClick = onCreateNew)
                )
            }

            // Search field + "Отмена"
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = WfmSpacing.L)
                    .padding(bottom = WfmSpacing.L),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S)
            ) {
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .background(colors.surfacePrimary, RoundedCornerShape(WfmRadius.L))
                        .border(1.dp, colors.borderSecondary, RoundedCornerShape(WfmRadius.L))
                        .padding(WfmSpacing.M),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S)
                ) {
                    BasicTextField(
                        value = searchQuery,
                        onValueChange = { newValue ->
                            if (!hasTrackedSearch && newValue.text.isNotEmpty()) {
                                hasTrackedSearch = true
                                onSearchUsed()
                            }
                            searchQuery = newValue
                        },
                        modifier = Modifier
                            .weight(1f)
                            .onFocusChanged { isSearchFocused = it.isFocused },
                        textStyle = WfmTypography.Body14Regular.copy(color = colors.textPrimary),
                        cursorBrush = SolidColor(colors.textBrand),
                        singleLine = true,
                        decorationBox = { innerTextField ->
                            if (searchQuery.text.isEmpty()) {
                                Text(
                                    text = "Поиск подзадачи",
                                    style = WfmTypography.Body14Regular,
                                    color = colors.textTertiary
                                )
                            }
                            innerTextField()
                        }
                    )

                    if (searchQuery.text.isNotEmpty()) {
                        Icon(
                            painter = painterResource(id = com.beyondviolet.wfm.ui.R.drawable.ic_close),
                            contentDescription = "Очистить",
                            tint = colors.iconSecondary,
                            modifier = Modifier
                                .size(16.dp)
                                .clickable {
                                    searchQuery = TextFieldValue("")
                                    focusManager.clearFocus()
                                }
                        )
                    }
                }

                AnimatedVisibility(
                    visible = isSearchFocused,
                    enter = slideInHorizontally { it } + fadeIn(),
                    exit = slideOutHorizontally { it } + fadeOut()
                ) {
                    Text(
                        text = "Отмена",
                        style = WfmTypography.Headline12Medium,
                        color = colors.textPrimary,
                        modifier = Modifier
                            .padding(WfmSpacing.M)
                            .clickable {
                                searchQuery = TextFieldValue("")
                                focusManager.clearFocus()
                            }
                    )
                }
            }

            // Список или пустое состояние
            if (filteredOperations.isEmpty() && searchQuery.text.isNotEmpty()) {
                Text(
                    text = "Мы не нашли такую подзадачу. Проверьте текст запроса или добавьте новую.",
                    style = WfmTypography.Body14Regular,
                    color = colors.inputCaption,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = WfmSpacing.L)
                        .padding(bottom = WfmSpacing.L)
                )
            } else {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
                ) {
                    // Подтверждённые (ACCEPTED / без статуса)
                    acceptedOperations.forEach { operation ->
                        WfmSelectionCard(
                            title = operation.name,
                            type = WfmSelectionCardType.SELECT,
                            isChecked = tempSelected.contains(operation.id),
                            showBorder = false,
                            contentPadding = PaddingValues(horizontal = WfmSpacing.M, vertical = WfmSpacing.S),
                            onTap = {
                                tempSelected = if (tempSelected.contains(operation.id)) {
                                    tempSelected - operation.id
                                } else {
                                    tempSelected + operation.id
                                }
                            },
                            modifier = Modifier.padding(horizontal = WfmSpacing.L)
                        )
                    }

                    // Коллапсируемая секция "Не подтверждённые" (PENDING)
                    if (pendingOperations.isNotEmpty()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { isPendingExpanded = !isPendingExpanded }
                                .padding(horizontal = WfmSpacing.L, vertical = WfmSpacing.S),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
                        ) {
                            Text(
                                text = "Не подтверждённые",
                                style = WfmTypography.Headline16Bold,
                                color = colors.textPrimary,
                                modifier = Modifier.weight(1f)
                            )
                            Icon(
                                painter = painterResource(
                                    id = if (isPendingExpanded) com.beyondviolet.wfm.ui.R.drawable.ic_chevron_up
                                    else com.beyondviolet.wfm.ui.R.drawable.ic_chevron_down
                                ),
                                contentDescription = null,
                                tint = colors.iconPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        AnimatedVisibility(
                            visible = isPendingExpanded,
                            enter = expandVertically(),
                            exit = shrinkVertically()
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
                            ) {
                                pendingOperations.forEach { operation ->
                                    WfmSelectionCard(
                                        title = operation.name,
                                        type = WfmSelectionCardType.SELECT,
                                        isChecked = tempSelected.contains(operation.id),
                                        showBorder = false,
                                        contentPadding = PaddingValues(horizontal = WfmSpacing.M, vertical = WfmSpacing.S),
                                        onTap = {
                                            tempSelected = if (tempSelected.contains(operation.id)) {
                                                tempSelected - operation.id
                                            } else {
                                                tempSelected + operation.id
                                            }
                                        },
                                        modifier = Modifier.padding(horizontal = WfmSpacing.L)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(WfmSpacing.L))
            }

            WfmPrimaryButton(
                text = if (tempSelected.isEmpty()) "Готово" else "Готово (${tempSelected.size})",
                enabled = tempSelected.isNotEmpty(),
                onClick = { onConfirm(tempSelected) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = WfmSpacing.L)
            )
        }
    }
}
