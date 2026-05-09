package com.beyondviolet.wfm.feature.auth.presentation.ui

import android.util.Log
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.fragment.app.FragmentActivity
import com.hcaptcha.sdk.HCaptcha
import com.hcaptcha.sdk.HCaptchaConfig
import com.hcaptcha.sdk.HCaptchaException
import com.hcaptcha.sdk.HCaptchaSize
import com.hcaptcha.sdk.HCaptchaTokenResponse

/**
 * Site key для hCaptcha из Memory Bank
 * См. .memory_bank/security/hcaptcha.md
 */
private const val HCAPTCHA_SITE_KEY = "18e5142d-9054-487b-af5d-ce24cf8a09f9"

/**
 * Компонент для отображения hCaptcha
 * Капча показывается автоматически при создании компонента
 *
 * @param onSuccess Вызывается при успешном решении капчи с токеном
 * @param onDismiss Вызывается при закрытии или ошибке
 */
@Composable
fun HCaptchaDialog(
    onSuccess: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Создаем и запускаем hCaptcha клиент автоматически
    LaunchedEffect(Unit) {
        try {
            val activity = context as? FragmentActivity
            if (activity == null) {
                Log.e("HCaptchaDialog", "Activity is not FragmentActivity")
                errorMessage = "Ошибка инициализации"
                return@LaunchedEffect
            }

            val hCaptcha = HCaptcha.getClient(activity).apply {
                setup(
                    HCaptchaConfig.builder()
                        .siteKey(HCAPTCHA_SITE_KEY)
                        .size(HCaptchaSize.NORMAL)
                        .build()
                )
            }

            // Запускаем капчу сразу - она откроется в своем окне
            hCaptcha
                .verifyWithHCaptcha()
                .addOnSuccessListener { response: HCaptchaTokenResponse ->
                    Log.d("HCaptchaDialog", "Captcha solved successfully")
                    onSuccess(response.tokenResult)
                }
                .addOnFailureListener { exception: HCaptchaException ->
                    Log.e("HCaptchaDialog", "Captcha failed: ${exception.message}", exception)
                    errorMessage = exception.message ?: "Ошибка капчи"
                    onDismiss()
                }
        } catch (e: Exception) {
            Log.e("HCaptchaDialog", "Exception during captcha setup: ${e.message}", e)
            errorMessage = e.message ?: "Ошибка инициализации"
        }
    }

    // Показываем диалог только при ошибке
    if (errorMessage != null) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Ошибка") },
            text = { Text(errorMessage ?: "Неизвестная ошибка") },
            confirmButton = {
                TextButton(onClick = onDismiss) {
                    Text("OK")
                }
            }
        )
    }
}
