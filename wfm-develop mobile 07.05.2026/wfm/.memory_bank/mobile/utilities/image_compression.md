# Сжатие изображений

Утилиты для сжатия изображений перед отправкой на сервер.

**Файлы:**
- **iOS:** `WFMApp/Core/Utilities/UIImageCompression.swift`
- **Android:** `app/src/main/java/com/beyondviolet/wfm/core/utils/ImageCompression.kt`

---

## Параметры сжатия

| Параметр | iOS | Android | Описание |
|----------|-----|---------|----------|
| Максимальный размер | 1920x1920 | 1920x1920 | Максимальный размер стороны (пропорции сохраняются) |
| Качество JPEG | 0.7 (70%) | 70 | Качество сжатия JPEG |
| Целевой размер | 1-2 MB | 1-2 MB | Ожидаемый размер результата |
| Формат | JPEG | JPEG | Всегда конвертируется в JPEG |

---

## Использование

### iOS

```swift
import UIKit

// Сжатие изображения
let compressedData = UIImageCompression.compressForUpload(image: selectedImage)

if let data = compressedData {
    // Отправка на сервер
    await tasksService.completeTaskWithPhoto(id: taskId, imageData: data)
} else {
    // Ошибка сжатия
    print("Failed to compress image")
}
```

**Параметры:**
- `image: UIImage` — исходное изображение
- `maxSize: CGFloat = 1920` — максимальный размер стороны
- `compressionQuality: CGFloat = 0.7` — качество JPEG (0.0 - 1.0)

**Возвращает:** `Data?` — сжатое изображение в формате JPEG или `nil` при ошибке

### Android

```kotlin
import android.net.Uri
import com.beyondviolet.wfm.core.utils.ImageCompression

// Сжатие изображения
val compressedData = ImageCompression.compressImage(context, imageUri)

if (compressedData != null) {
    // Отправка на сервер
    tasksService.completeTaskWithPhoto(taskId, compressedData)
} else {
    // Ошибка сжатия
    Log.e("TAG", "Failed to compress image")
}
```

**Параметры:**
- `context: Context` — Android Context для доступа к ContentResolver
- `uri: Uri` — Uri изображения
- `maxSize: Int = 1920` — максимальный размер стороны
- `quality: Int = 70` — качество JPEG (0-100)

**Возвращает:** `ByteArray?` — сжатое изображение или `null` при ошибке

---

## Алгоритм сжатия

### iOS

1. **Вычисление нового размера** с сохранением пропорций
2. **Ресайз изображения** через `UIGraphicsImageRenderer` (scale = 1)
3. **Конвертация в JPEG** с качеством 0.7

**Особенности:**
- Используется `UIGraphicsImageRenderer` с `format.scale = 1` для игнорирования @2x/@3x
- Автоматически корректируется ориентация (UIKit обрабатывает EXIF автоматически)

### Android

1. **Чтение изображения** из Uri через ContentResolver
2. **Коррекция ориентации** на основе EXIF данных (поворот на 90°/180°/270° если нужно)
3. **Вычисление нового размера** с сохранением пропорций
4. **Ресайз изображения** через `Bitmap.createScaledBitmap()`
5. **Освобождение памяти** промежуточных bitmap (`recycle()`)
6. **Конвертация в JPEG** с качеством 70

**Особенности:**
- Автоматическая коррекция ориентации на основе EXIF (фото с камеры могут иметь неправильную ориентацию)
- Явное управление памятью через `bitmap.recycle()` для избежания OutOfMemoryError
- Логирование размера до и после сжатия

---

## Обработка ошибок

### iOS

```swift
guard let compressedData = UIImageCompression.compressForUpload(image: image) else {
    // Показать ошибку пользователю
    toastManager.show(message: "Не удалось обработать изображение", state: .error)
    return
}
```

### Android

```kotlin
val compressedData = ImageCompression.compressImage(context, imageUri)

if (compressedData == null) {
    // Показать ошибку пользователю
    toastManager.show("Не удалось обработать изображение", state = WfmToastState.ERROR)
    return
}
```

**Возможные причины ошибок:**
- Некорректный Uri (файл не найден)
- Поврежденное изображение (не удалось декодировать)
- Недостаточно памяти (Android)
- Ошибка доступа к ContentResolver (Android)

---

## Примеры использования

### CompleteConfirmationSheet

**iOS:**
```swift
// TaskDetailViewModel.swift
func completeTaskWithPhoto(_ image: UIImage) async -> Bool {
    // Сжимаем изображение
    guard let imageData = UIImageCompression.compressForUpload(image: image) else {
        toastManager.show(message: "Не удалось обработать изображение", state: .error)
        return false
    }

    // Отправляем на сервер
    do {
        task = try await tasksService.completeTaskWithPhoto(id: taskId, imageData: imageData)
        return true
    } catch {
        toastManager.show(message: error.localizedDescription, state: .error)
        return false
    }
}
```

**Android:**
```kotlin
// TaskDetailsViewModel.kt
suspend fun completeTaskWithPhoto(imageUri: Uri): Boolean {
    // Сжимаем изображение
    val imageData = ImageCompression.compressImage(context, imageUri)

    if (imageData == null) {
        toastManager.show("Не удалось обработать изображение", state = WfmToastState.ERROR)
        return false
    }

    // Отправляем на сервер
    when (val response = tasksService.completeTaskWithPhoto(taskId, imageData)) {
        is ApiResponse.Success -> {
            _uiState.value = TaskDetailsUiState.Success(response.data)
            return true
        }
        is ApiResponse.Error -> {
            toastManager.show(response.message, state = WfmToastState.ERROR)
            return false
        }
    }
}
```

---

## Зависимости

### iOS
- `UIKit` (встроенный фреймворк)

### Android
- `androidx.exifinterface:exifinterface` — для чтения EXIF данных и коррекции ориентации

**build.gradle.kts:**
```kotlin
dependencies {
    implementation("androidx.exifinterface:exifinterface:1.3.7")
}
```

---

## Связанные документы

- **BottomSheet:** `.memory_bank/mobile/ui/bottomsheet.md` — CompleteConfirmationSheet с фото
- **TasksService:** Отправка multipart/form-data с изображением
- **Android Manifest:** Разрешения на камеру и галерею
