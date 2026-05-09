package com.beyondviolet.wfm.core.utils

import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.foundation.clickable
import androidx.compose.ui.composed
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Debounce для кликов - игнорирует повторные клики в течение заданного времени
 *
 * Используется для предотвращения двойных кликов на навигационных кнопках,
 * которые могут привести к множественным pop() в navigation stack
 *
 * @param debounceTime время в миллисекундах, в течение которого игнорируются повторные клики
 * @param onClick callback, который будет вызван только один раз
 * @return Pair из enabled флага и debounced callback
 */
@Composable
fun rememberDebouncedClick(
    debounceTime: Long = 500L,
    onClick: () -> Unit
): Pair<Boolean, () -> Unit> {
    var isEnabled by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    val debouncedClick: () -> Unit = remember(onClick) {
        {
            if (isEnabled) {
                isEnabled = false
                onClick()

                // Восстанавливаем enabled через debounceTime
                scope.launch {
                    delay(debounceTime)
                    isEnabled = true
                }
            }
        }
    }

    return Pair(isEnabled, debouncedClick)
}

/**
 * Modifier для clickable с debounce
 *
 * Пример:
 * ```
 * Box(
 *     modifier = Modifier.clickableDebounced {
 *         navController.popBackStack()
 *     }
 * )
 * ```
 */
@Composable
fun Modifier.clickableDebounced(
    debounceTime: Long = 500L,
    onClick: () -> Unit
): Modifier = composed {
    val (isEnabled, debouncedClick) = rememberDebouncedClick(debounceTime, onClick)

    this.clickable(
        enabled = isEnabled,
        onClick = debouncedClick
    )
}
