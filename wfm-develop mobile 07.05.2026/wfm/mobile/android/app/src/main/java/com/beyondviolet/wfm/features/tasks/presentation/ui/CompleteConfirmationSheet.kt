package com.beyondviolet.wfm.features.tasks.presentation.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.ui.components.ToastManager
import java.io.File
import com.beyondviolet.wfm.ui.components.WfmBottomSheet
import com.beyondviolet.wfm.ui.components.WfmButtonSize
import com.beyondviolet.wfm.ui.components.WfmPrimaryButton
import com.beyondviolet.wfm.ui.components.WfmSecondaryButton
import com.beyondviolet.wfm.ui.components.WfmToastState
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * BottomSheet подтверждения завершения задачи (с опциональным фото)
 *
 * Использование:
 * ```kotlin
 * WfmBottomSheet(
 *     isVisible = showCompleteConfirmation,
 *     onDismiss = { viewModel.cancelComplete() },
 *     showOverlay = true
 * ) {
 *     CompleteConfirmationSheet(
 *         requiresPhoto = task.requiresPhoto ?: false,
 *         toastManager = viewModel.getToastManager(),
 *         coroutineScope = viewModel.viewModelScope,
 *         onConfirm = { uri ->
 *             if (uri != null) {
 *                 viewModel.completeTaskWithPhoto(uri)
 *             } else {
 *                 viewModel.completeTask()
 *             }
 *         },
 *         onCancel = { viewModel.cancelComplete() }
 *     )
 * }
 * ```
 */
@Composable
fun CompleteConfirmationSheet(
    requiresPhoto: Boolean = false,
    toastManager: ToastManager,
    coroutineScope: CoroutineScope,
    onConfirm: suspend (Uri?) -> Boolean,
    onCancel: () -> Unit
) {
    val colors = WfmTheme.colors
    val context = LocalContext.current

    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var selectedImageName by remember { mutableStateOf<String?>(null) }
    var showImageSourceDialog by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }

    // Uri для фото с камеры
    var cameraImageUri by remember { mutableStateOf<Uri?>(null) }

    // Функция для создания временного файла
    fun createImageFile(): Uri {
        val imageFile = File(context.cacheDir, "task_photo_${System.currentTimeMillis()}.jpg")
        return FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            imageFile
        )
    }

    // Launcher для камеры
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && cameraImageUri != null) {
            selectedImageUri = cameraImageUri
            selectedImageName = "IMG_${(1000..9999).random()}.jpg"
        }
    }

    // Launcher для запроса разрешения на камеру
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            // Разрешение получено - открываем камеру
            cameraImageUri = createImageFile()
            cameraLauncher.launch(cameraImageUri!!)
        } else {
            // Разрешение отклонено
            toastManager.show(
                "Для съёмки фото необходимо разрешение на использование камеры",
                state = WfmToastState.ERROR
            )
        }
    }

    // Launcher для выбора из галереи
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        uri?.let {
            selectedImageUri = it
            // Получаем имя файла
            selectedImageName = try {
                context.contentResolver.query(it, null, null, null, null)?.use { cursor ->
                    val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                    cursor.moveToFirst()
                    cursor.getString(nameIndex)
                } ?: "IMG_${(1000..9999).random()}.jpg"
            } catch (e: Exception) {
                "IMG_${(1000..9999).random()}.jpg"
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(WfmSpacing.XL),
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.XL)
    ) {
        // Текст
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Завершить задачу?",
                style = WfmTypography.Headline20Bold,
                color = colors.textPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            if (requiresPhoto) {
                Text(
                    text = "Для завершения необходимо добавить фотографию выполненной работы.",
                    style = WfmTypography.Body16Regular,
                    color = colors.textPrimary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        // Preview фото или кнопка добавления (только если requiresPhoto)
        if (requiresPhoto) {
            if (selectedImageUri != null && selectedImageName != null) {
                PhotoPreviewCard(
                    imageUri = selectedImageUri!!,
                    fileName = selectedImageName!!,
                    onDelete = {
                        selectedImageUri = null
                        selectedImageName = null
                    }
                )
            } else {
                // Кнопка "Добавить фото"
                WfmSecondaryButton(
                    text = "Добавить фото  (.jpg, до 10 мб)",
                    onClick = {
                        showImageSourceDialog = true
                    },
                    icon = R.drawable.ic_plus,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        // BottomSheet выбора источника фото
        WfmBottomSheet(
            isVisible = showImageSourceDialog,
            onDismiss = { showImageSourceDialog = false },
            showOverlay = false
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = WfmSpacing.XL)
                    .padding(bottom = WfmSpacing.XL)
            ) {
                // Опция: Сделать фото
                Text(
                    text = "Сделать фото",
                    style = WfmTypography.Headline16Bold,
                    color = colors.buttonLinkTextDefault,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            showImageSourceDialog = false
                            cameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
                        }
                        .padding(vertical = WfmSpacing.L)
                )

                HorizontalDivider(
                    color = colors.borderSecondary,
                    thickness = 1.dp
                )

                // Опция: Выбрать из галереи
                Text(
                    text = "Выбрать из галереи",
                    style = WfmTypography.Headline16Bold,
                    color = colors.buttonLinkTextDefault,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            showImageSourceDialog = false
                            photoPickerLauncher.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        }
                        .padding(vertical = WfmSpacing.L)
                )
            }
        }

        // Кнопки действий
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(IntrinsicSize.Min),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            WfmSecondaryButton(
                text = "Отмена",
                onClick = onCancel,
                size = WfmButtonSize.Big,
                enabled = !isSubmitting,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
            )

            WfmPrimaryButton(
                text = "Завершить",
                onClick = {
                    // Используем viewModelScope (переданный из ViewModel) для запуска coroutine
                    // Это гарантирует, что операция не будет отменена при закрытии BottomSheet
                    coroutineScope.launch {
                        isSubmitting = true
                        onConfirm(selectedImageUri)
                        // BottomSheet закроется через ViewModel (_showCompleteConfirmation.value = false)
                        // и при успехе, и при ошибке (чтобы Toast был виден)
                    }
                },
                enabled = (!requiresPhoto || selectedImageUri != null) && !isSubmitting,
                isLoading = isSubmitting,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
            )
        }
    }
}

// MARK: - Photo Preview Card

@Composable
private fun PhotoPreviewCard(
    imageUri: Uri,
    fileName: String,
    onDelete: () -> Unit
) {
    val colors = WfmTheme.colors

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(WfmSpacing.XL),
        color = colors.surfaceRaised
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(WfmSpacing.M),
            horizontalArrangement = Arrangement.spacedBy(WfmSpacing.M),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Preview изображения
            AsyncImage(
                model = imageUri,
                contentDescription = "Preview",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(WfmRadius.S))
            )

            // Информация о файле
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = fileName,
                    style = WfmTypography.Headline16Bold,
                    color = colors.textPrimary,
                    maxLines = 1
                )

                Text(
                    text = "Удалить",
                    style = WfmTypography.Headline14Medium,
                    color = colors.buttonSecondaryTextDefault,
                    modifier = Modifier.clickable { onDelete() }
                )
            }
        }
    }
}

// MARK: - Preview

@Preview(showBackground = true)
@Composable
private fun CompleteConfirmationSheetPreview() {
    val coroutineScope = rememberCoroutineScope()
    WfmTheme {
        Surface {
            CompleteConfirmationSheet(
                requiresPhoto = false,
                toastManager = ToastManager(),
                coroutineScope = coroutineScope,
                onConfirm = { true },
                onCancel = {}
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun CompleteConfirmationSheetWithPhotoPreview() {
    val coroutineScope = rememberCoroutineScope()
    WfmTheme {
        Surface {
            CompleteConfirmationSheet(
                requiresPhoto = true,
                toastManager = ToastManager(),
                coroutineScope = coroutineScope,
                onConfirm = { true },
                onCancel = {}
            )
        }
    }
}
