package com.beyondviolet.wfm.core.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import java.io.ByteArrayOutputStream
import java.io.InputStream
import kotlin.math.max

/**
 * Утилиты для сжатия изображений перед отправкой на сервер
 */
object ImageCompression {

    /**
     * Сжать изображение для отправки на сервер
     * - Ресайз до максимального размера 1920x1920
     * - JPEG сжатие с качеством 99%
     * - Целевой размер: до 1-2 MB
     *
     * @param context Android Context для доступа к ContentResolver
     * @param uri Uri изображения
     * @param maxSize Максимальный размер стороны (по умолчанию 1920)
     * @param quality Качество JPEG (0-100)
     * @return ByteArray сжатого изображения или null если не удалось
     */
    fun compressImage(
        context: Context,
        uri: Uri,
        maxSize: Int = 1920,
        quality: Int = 99
    ): ByteArray? {
        return try {
            // 1. Читаем изображение из Uri
            val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
            val originalBitmap = BitmapFactory.decodeStream(inputStream)
            inputStream?.close()

            if (originalBitmap == null) {
                android.util.Log.e("ImageCompression", "Failed to decode bitmap from Uri")
                return null
            }

            android.util.Log.d(
                "ImageCompression",
                "Original image size: ${originalBitmap.width}x${originalBitmap.height}"
            )

            // 2. Корректируем ориентацию если нужно (EXIF)
            val rotatedBitmap = correctOrientation(context, uri, originalBitmap)

            // 3. Вычисляем новый размер с сохранением пропорций
            val width = rotatedBitmap.width
            val height = rotatedBitmap.height
            val ratio = max(width, height).toFloat() / maxSize.toFloat()

            val newWidth: Int
            val newHeight: Int

            if (ratio > 1) {
                newWidth = (width / ratio).toInt()
                newHeight = (height / ratio).toInt()
            } else {
                newWidth = width
                newHeight = height
            }

            // 4. Ресайзим изображение
            val resizedBitmap = Bitmap.createScaledBitmap(
                rotatedBitmap,
                newWidth,
                newHeight,
                true
            )

            // Освобождаем память от промежуточных bitmap
            if (rotatedBitmap != originalBitmap) {
                rotatedBitmap.recycle()
            }
            originalBitmap.recycle()

            // 5. Конвертируем в JPEG с заданным качеством
            val outputStream = ByteArrayOutputStream()
            resizedBitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
            resizedBitmap.recycle()

            val compressedData = outputStream.toByteArray()
            val sizeInMB = compressedData.size / 1024.0 / 1024.0

            android.util.Log.d(
                "ImageCompression",
                "Compressed image size: %.2f MB (%d bytes)".format(sizeInMB, compressedData.size)
            )

            compressedData

        } catch (e: Exception) {
            android.util.Log.e("ImageCompression", "Failed to compress image", e)
            null
        }
    }

    /**
     * Корректирует ориентацию изображения на основе EXIF данных
     */
    private fun correctOrientation(context: Context, uri: Uri, bitmap: Bitmap): Bitmap {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri)
            val exif = inputStream?.let { ExifInterface(it) }
            inputStream?.close()

            val orientation = exif?.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            ) ?: ExifInterface.ORIENTATION_NORMAL

            when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> rotateBitmap(bitmap, 90f)
                ExifInterface.ORIENTATION_ROTATE_180 -> rotateBitmap(bitmap, 180f)
                ExifInterface.ORIENTATION_ROTATE_270 -> rotateBitmap(bitmap, 270f)
                else -> bitmap
            }
        } catch (e: Exception) {
            android.util.Log.e("ImageCompression", "Failed to correct orientation", e)
            bitmap
        }
    }

    /**
     * Поворачивает bitmap на заданный угол
     */
    private fun rotateBitmap(bitmap: Bitmap, degrees: Float): Bitmap {
        val matrix = Matrix()
        matrix.postRotate(degrees)
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }
}
