package com.beyondviolet.wfm.features.tasks.presentation.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.TextFieldValue
import com.beyondviolet.wfm.ui.components.WfmBottomSheet
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.components.WfmTextField
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.surfacePrimary
import com.beyondviolet.wfm.ui.theme.textPrimary

/**
 * Bottom Sheet для создания новой подзадачи.
 *
 * Дизайн: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=4980-49548
 *
 * @param isVisible Показать или скрыть BottomSheet
 * @param onConfirm Callback с именем новой подзадачи при нажатии "Создать подзадачу"
 * @param onDismiss Callback при закрытии BottomSheet
 */
@Composable
fun CreateOperationBottomSheet(
    isVisible: Boolean,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember(isVisible) { mutableStateOf(TextFieldValue("")) }
    val colors = WfmTheme.colors

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
            Text(
                text = "Новая подзадача",
                style = WfmTypography.Headline18Bold,
                color = colors.textPrimary,
                modifier = Modifier
                    .padding(horizontal = WfmSpacing.L)
                    .padding(bottom = WfmSpacing.M)
            )

            WfmTextField(
                value = name,
                onValueChange = { name = it },
                placeholder = "Введите название",
                label = "Название подзадачи",
                backgroundColor = colors.surfacePrimary,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = WfmSpacing.L)
                    .padding(bottom = WfmSpacing.L)
            )

            WfmPrimaryButton(
                text = "Создать подзадачу",
                enabled = name.text.trim().isNotEmpty(),
                onClick = {
                    val trimmed = name.text.trim()
                    if (trimmed.isNotEmpty()) onConfirm(trimmed)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = WfmSpacing.L)
            )
        }
    }
}
