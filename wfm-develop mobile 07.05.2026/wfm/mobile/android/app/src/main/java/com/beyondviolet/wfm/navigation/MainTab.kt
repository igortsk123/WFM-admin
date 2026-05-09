package com.beyondviolet.wfm.navigation

import androidx.annotation.DrawableRes
import com.beyondviolet.wfm.R

/**
 * Описание табов главного экрана
 *
 * @param route Уникальный маршрут таба
 * @param title Заголовок для отображения
 * @param icon Ресурс иконки таба
 */
sealed class MainTab(
    val route: String,
    val title: String,
    @DrawableRes val icon: Int
) {
    data object Home : MainTab(
        route = "tab_home",
        title = "Главная",
        icon = R.drawable.ic_tab_home
    )

    data object Tasks : MainTab(
        route = "tab_tasks",
        title = "Задачи",
        icon = R.drawable.ic_tab_tasks
    )

    data object Control : MainTab(
        route = "tab_control",
        title = "Контроль",
        icon = R.drawable.ic_tab_control
    )

    data object Settings : MainTab(
        route = "tab_settings",
        title = "Профиль",
        icon = R.drawable.ic_tab_profile
    )

    companion object {
        /** Табы для работника (без Control) */
        val workerEntries = listOf(Home, Tasks, Settings)

        /** Табы для менеджера (с Control) */
        val managerEntries = listOf(Home, Tasks, Control, Settings)

        /** Стартовый таб */
        val startTab = Home
    }
}
