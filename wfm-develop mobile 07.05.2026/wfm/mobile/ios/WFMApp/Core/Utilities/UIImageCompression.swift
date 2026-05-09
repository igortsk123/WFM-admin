import UIKit

/// Утилиты для сжатия изображений перед отправкой на сервер
struct UIImageCompression {
    /// Сжать изображение для отправки на сервер
    /// - Ресайз до максимального размера 1920x1920
    /// - JPEG сжатие с качеством 0.99
    /// - Целевой размер: до 1-2 MB
    ///
    /// - Parameters:
    ///   - image: Исходное изображение
    ///   - maxSize: Максимальный размер стороны (по умолчанию 1920)
    ///   - compressionQuality: Качество JPEG (0.0 - 1.0)
    /// - Returns: Data сжатого изображения или nil если не удалось
    static func compressForUpload(
        image: UIImage,
        maxSize: CGFloat = 1920,
        compressionQuality: CGFloat = 0.99
    ) -> Data? {
        // 1. Вычисляем новый размер с сохранением пропорций
        let size = image.size
        let ratio = max(size.width, size.height) / maxSize

        let newSize: CGSize
        if ratio > 1 {
            newSize = CGSize(
                width: size.width / ratio,
                height: size.height / ratio
            )
        } else {
            newSize = size  // Изображение уже меньше maxSize
        }

        // 2. Ресайзим изображение
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1  // Важно: scale = 1, иначе будет учитываться @2x/@3x

        let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
        let resizedImage = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }

        // 3. Конвертируем в JPEG с заданным качеством
        return resizedImage.jpegData(compressionQuality: compressionQuality)
    }
}
