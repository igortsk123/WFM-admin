package com.beyondviolet.wfm.features.noassignments

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.core.managers.UserManager
import com.beyondviolet.wfm.ui.components.WfmSecondaryButton
import com.beyondviolet.wfm.ui.components.WfmTextButton
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.core.utils.rememberDebouncedClick
import com.beyondviolet.wfm.ui.theme.*
import org.koin.compose.koinInject

/**
 * Экран-заглушка при отсутствии назначения или ошибке загрузки пользователя.
 *
 * Два варианта:
 * - [isError] = false → нет назначения (иконка info, "Нет назначения")
 * - [isError] = true  → ошибка API (иконка phone-off, "Номер не найден в базе")
 *
 * Автоматически уходит на главный экран при появлении assignment.
 */
@Composable
fun NoAssignmentsScreen(
    isError: Boolean = false,
    userManager: UserManager = koinInject(),
    onLogout: () -> Unit,
    onAssignmentReceived: () -> Unit = {}
) {
    val error by userManager.error.collectAsState()
    val currentAssignment by userManager.currentAssignment.collectAsState()

    // Авто-навигация при получении назначения
    LaunchedEffect(currentAssignment, error) {
        if (currentAssignment != null && error == null) {
            onAssignmentReceived()
        }
    }

    val scope = rememberCoroutineScope()

    val (_, debouncedLogout) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = onLogout
    )

    val (_, debouncedRefresh) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = { scope.launch { userManager.loadCurrentRole() } }
    )

    val colors = WfmTheme.colors

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.surfacePrimary)
            .statusBarsPadding()
            .navigationBarsPadding(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = WfmSpacing.L),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(WfmSpacing.S)
        ) {
            // Иконка-заглушка (56x56, лавандовый круг + иконка)
            Icon(
                painter = painterResource(
                    id = if (isError) R.drawable.ic_phone_off
                    else R.drawable.ic_featured_info
                ),
                contentDescription = null,
                modifier = Modifier.size(56.dp),
                tint = Color.Unspecified
            )

            // Заголовок
            Text(
                text = if (isError) "Номер не найден в базе" else "Нет назначения",
                style = WfmTypography.Headline18Bold,
                color = colors.textPrimary,
                textAlign = TextAlign.Center
            )

            // Подзаголовок
            Text(
                text = if (isError)
                    "Обратитесь к руководителю, чтобы его актуализировать"
                else
                    "Обратитесь к руководителю, чтобы получить его",
                style = WfmTypography.Body16Regular,
                color = colors.cardTextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Кнопка выхода
            WfmSecondaryButton(
                text = "Попробовать другой номер",
                onClick = debouncedLogout,
                modifier = Modifier.fillMaxWidth()
            )

            // Кнопка обновления
            WfmTextButton(
                text = "Обновить",
                onClick = debouncedRefresh
            )
        }
    }
}
