package com.beyondviolet.wfm.feature.auth.presentation.navigation

import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.navigation
import com.beyondviolet.wfm.feature.auth.presentation.ui.CodeInputScreen
import com.beyondviolet.wfm.feature.auth.presentation.ui.PhoneInputScreen
import com.beyondviolet.wfm.feature.auth.presentation.ui.SupportScreen
import com.beyondviolet.wfm.feature.auth.presentation.viewmodels.AuthViewModel
import com.beyondviolet.wfm.feature.auth.util.MaxUtils
import com.beyondviolet.wfm.feature.auth.util.MessengerUtils
import com.beyondviolet.wfm.feature.auth.util.TelegramUtils
import org.koin.androidx.compose.koinViewModel

/**
 * Маршруты auth flow
 */
object AuthRoute {
    const val ROOT = "auth"
    const val PHONE_INPUT = "phone_input"
    const val CODE_INPUT = "code_input"
    const val SUPPORT = "support"
}

/**
 * Navigation graph для авторизации
 *
 * @param navController Контроллер навигации
 * @param onAuthenticationCompleted Callback при успешной авторизации
 * @param onTrack Callback для передачи событий аналитики в основное приложение
 */
fun NavGraphBuilder.authNavGraph(
    navController: NavHostController,
    onAuthenticationCompleted: () -> Unit,
    onTrack: ((String) -> Unit)? = null
) {
    navigation(
        startDestination = AuthRoute.PHONE_INPUT,
        route = AuthRoute.ROOT
    ) {
        composable(AuthRoute.PHONE_INPUT) { backStackEntry ->
            // Получаем ViewModel из parent navigation entry (Auth)
            val parentEntry = remember(backStackEntry) {
                navController.getBackStackEntry(AuthRoute.ROOT)
            }
            val authViewModel = koinViewModel<AuthViewModel>(
                viewModelStoreOwner = parentEntry
            )
            // Передаём аналитику через callback (feature-auth не зависит от app модуля)
            authViewModel.onTrack = onTrack
            val context = LocalContext.current

            PhoneInputScreen(
                viewModel = authViewModel,
                onCodeSent = { channel, botUsername, botStartPayload ->
                    when (channel) {
                        "telegram" -> TelegramUtils.openIfNeeded(context, botUsername, botStartPayload)
                        "max" -> MaxUtils.openIfNeeded(context, botUsername, botStartPayload)
                    }
                    navController.navigate(AuthRoute.CODE_INPUT)
                },
                onSupportClick = {
                    navController.navigate(AuthRoute.SUPPORT)
                }
            )
        }

        composable(AuthRoute.SUPPORT) {
            SupportScreen(
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(AuthRoute.CODE_INPUT) { backStackEntry ->
            // Получаем тот же ViewModel из parent navigation entry (Auth)
            val parentEntry = remember(backStackEntry) {
                navController.getBackStackEntry(AuthRoute.ROOT)
            }
            val authViewModel = koinViewModel<AuthViewModel>(
                viewModelStoreOwner = parentEntry
            )
            // Передаём аналитику через callback (feature-auth не зависит от app модуля)
            authViewModel.onTrack = onTrack
            val context = LocalContext.current

            CodeInputScreen(
                viewModel = authViewModel,
                onAuthSuccess = onAuthenticationCompleted,
                onBackToPhone = {
                    navController.popBackStack()
                },
                onOpenMessenger = { channel, botUsername, _ ->
                    // Кнопка в UI — всегда открываем мессенджер, payload не нужен
                    val url = when (channel) {
                        "telegram" -> botUsername?.let { TelegramUtils.createTelegramDeepLink(it) }
                        "max" -> botUsername?.let { MaxUtils.createMaxDeepLink(it) }
                        else -> null
                    }
                    url?.let { MessengerUtils.openUrl(context, it) }
                }
            )
        }

    }
}

