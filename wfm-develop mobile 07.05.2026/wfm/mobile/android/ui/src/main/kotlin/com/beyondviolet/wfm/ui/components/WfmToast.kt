package com.beyondviolet.wfm.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.LocalWfmColors
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

// MARK: - Типы

/** Тип тоста (определяет содержимое) */
sealed class WfmToastType {
    /** Только текст */
    object Text : WfmToastType()

    /** Текст + кнопка-ссылка */
    data class TextWithButton(
        val buttonTitle: String,
        val action: () -> Unit
    ) : WfmToastType()
}

/** Состояние тоста (определяет цвет фона) */
enum class WfmToastState {
    /** Стандартный (тёмный фон) */
    DEFAULT,
    /** Ошибка (красный фон) */
    ERROR
}

/** Данные для отображения тоста */
data class WfmToastData(
    val message: String,
    val type: WfmToastType = WfmToastType.Text,
    val state: WfmToastState = WfmToastState.DEFAULT
)

// MARK: - Компонент

/**
 * Toast-уведомление дизайн-системы WFM.
 *
 * Использование через [WfmToastHost]:
 * ```kotlin
 * WfmToastHost(toastManager = toastManager)
 * ```
 *
 * Показ тоста из ViewModel:
 * ```kotlin
 * toastManager.show("Смена открыта")
 * toastManager.show("Ошибка", state = WfmToastState.ERROR)
 * toastManager.show("Задача назначена", type = WfmToastType.TextWithButton("Перейти") { navigate() })
 * ```
 */
@Composable
internal fun WfmToastContent(data: WfmToastData, modifier: Modifier = Modifier) {
    val colors = LocalWfmColors.current

    val bgColor = when (data.state) {
        WfmToastState.DEFAULT -> colors.toastBg
        WfmToastState.ERROR   -> colors.toastBgError
    }

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        color = bgColor
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = data.message,
                style = WfmTypography.Body15Regular,
                color = colors.toastText,
                modifier = Modifier.weight(1f)
            )

            if (data.type is WfmToastType.TextWithButton) {
                TextButton(onClick = data.type.action) {
                    Text(
                        text = data.type.buttonTitle,
                        style = WfmTypography.Headline12Medium,
                        color = colors.toastText
                    )
                }
            }
        }
    }
}

// MARK: - Host

/**
 * Контейнер для тостов. Размещается в корневом Scaffold приложения.
 *
 * Для показа тостов поверх BottomSheet используйте параметр `toastManager`
 * в компоненте WfmBottomSheet.
 *
 * ```kotlin
 * Box(modifier = Modifier.fillMaxSize()) {
 *     // Контент приложения
 *     WfmToastHost(toastManager = toastManager)
 * }
 * ```
 */
@Composable
fun WfmToastHost(
    toastManager: ToastManager,
    modifier: Modifier = Modifier
) {
    val isVisible by toastManager.isVisible.collectAsState()
    val current by toastManager.current.collectAsState()

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(bottom = 8.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        AnimatedVisibility(
            visible = isVisible && current != null,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut()
        ) {
            current?.let { data ->
                WfmToastContent(data = data)
            }
        }
    }
}
