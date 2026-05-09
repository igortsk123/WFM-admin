package com.beyondviolet.wfm.features.settings

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.components.WfmBottomSheet
import com.beyondviolet.wfm.ui.theme.WFMAppTheme
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.textPrimary
import com.beyondviolet.wfm.ui.theme.textSecondary
import com.beyondviolet.wfm.ui.theme.textTertiary
import com.beyondviolet.wfm.ui.theme.surfaceSecondary
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel

/**
 * BottomSheet с QR-кодом для скачивания приложения
 */
@Composable
fun ShareAppBottomSheet(
    isVisible: Boolean,
    onDismiss: () -> Unit,
    url: String = "https://wfm.beyondviolet.com/download",
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val qrBitmap = remember(url) { generateQRCode(url) }

    WfmBottomSheet(
        isVisible = isVisible,
        onDismiss = onDismiss,
        showOverlay = true,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = WfmSpacing.L, vertical = WfmSpacing.L),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Заголовок
            Text(
                text = "Поделиться приложением",
                style = WfmTypography.Headline20Bold,
                color = colors.textPrimary,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Start
            )

            // QR-код
            if (qrBitmap != null) {
                Image(
                    bitmap = qrBitmap.asImageBitmap(),
                    contentDescription = "QR-код для скачивания приложения",
                    modifier = Modifier
                        .size(200.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.White)
                        .padding(8.dp)
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(200.dp)
                        .background(colors.surfaceSecondary, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Не удалось создать QR-код",
                        style = WfmTypography.Body14Regular,
                        color = colors.textSecondary,
                        textAlign = TextAlign.Center
                    )
                }
            }

            // Описание
            Text(
                text = "Отсканируйте QR-код, чтобы скачать приложение",
                style = WfmTypography.Body14Regular,
                color = colors.textSecondary,
                textAlign = TextAlign.Center
            )

            // Ссылка
            Text(
                text = url,
                style = WfmTypography.Caption12Regular,
                color = colors.textTertiary,
                textAlign = TextAlign.Center
            )
        }
    }
}

/**
 * Генерация QR-кода из строки
 */
private fun generateQRCode(content: String, size: Int = 512): Bitmap? {
    return try {
        val hints = mapOf(
            EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.H,
            EncodeHintType.MARGIN to 1
        )

        val writer = QRCodeWriter()
        val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size, hints)

        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
        for (x in 0 until size) {
            for (y in 0 until size) {
                bitmap.setPixel(x, y, if (bitMatrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
            }
        }
        bitmap
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}

// ─────────────────────────────────────────────────────────────────
// PREVIEW
// ─────────────────────────────────────────────────────────────────

@Preview(name = "Share App Bottom Sheet - Light", showBackground = true)
@Composable
private fun ShareAppBottomSheetPreview() {
    WFMAppTheme(darkTheme = false) {
        Box(modifier = Modifier.fillMaxSize()) {
            ShareAppBottomSheet(
                isVisible = true,
                onDismiss = {}
            )
        }
    }
}

@Preview(name = "Share App Bottom Sheet - Dark", showBackground = true)
@Composable
private fun ShareAppBottomSheetDarkPreview() {
    WFMAppTheme(darkTheme = true) {
        Box(modifier = Modifier.fillMaxSize()) {
            ShareAppBottomSheet(
                isVisible = true,
                onDismiss = {}
            )
        }
    }
}
