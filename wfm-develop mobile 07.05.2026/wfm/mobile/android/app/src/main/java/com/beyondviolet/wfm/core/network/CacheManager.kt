package com.beyondviolet.wfm.core.network

import android.content.Context
import android.util.Log
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.util.concurrent.ConcurrentHashMap

/**
 * Управляет кэшированием HTTP ответов (in-memory + disk)
 */
class CacheManager(context: Context) {
    companion object {
        @PublishedApi
        internal const val TAG = "CacheManager"

        // TTL кэша (7 дней в миллисекундах)
        @PublishedApi
        internal const val DEFAULT_TTL = 7L * 24 * 60 * 60 * 1000

        // Максимальный размер disk cache (50 MB)
        @PublishedApi
        internal const val DISK_CACHE_LIMIT = 50L * 1024 * 1024

        /**
         * Генерирует ключ кэша из path и query params
         */
        fun cacheKey(path: String, queryParams: Map<String, String> = emptyMap()): String {
            if (queryParams.isEmpty()) {
                return path
            }

            val sortedQuery = queryParams.entries
                .sortedBy { it.key }
                .joinToString("&") { "${it.key}=${it.value}" }

            return "$path?$sortedQuery"
        }
    }

    // In-memory cache
    @PublishedApi
    internal val memoryCache = ConcurrentHashMap<String, CacheEntry>()

    // Disk cache directory
    @PublishedApi
    internal val diskCacheDir: File = context.cacheDir.resolve("http-cache").apply {
        if (!exists()) {
            mkdirs()
            Log.i(TAG, "📦 Created cache directory: $absolutePath")
        }
    }

    init {
        Log.i(TAG, "📦 CacheManager initialized (TTL: ${DEFAULT_TTL / 1000}s, Disk: ${DISK_CACHE_LIMIT / 1024 / 1024}MB)")
    }

    /**
     * Получить данные из кэша
     */
    inline fun <reified T> get(key: String): T? {
        // 1. Проверяем in-memory cache
        memoryCache[key]?.let { entry ->
            if (System.currentTimeMillis() - entry.timestamp < DEFAULT_TTL) {
                Log.d(TAG, "✅ Memory cache HIT: $key")
                return try {
                    Json.decodeFromString<T>(entry.data)
                } catch (e: kotlinx.serialization.SerializationException) {
                    // Схема данных изменилась - удаляем из кэша
                    Log.w(TAG, "⚠️ Schema changed, clearing memory cache for: $key")
                    memoryCache.remove(key)
                    // Также удаляем с диска
                    diskCacheDir.resolve(key.hashCode().toString()).delete()
                    null
                } catch (e: Exception) {
                    // Другие ошибки (например IOException) - не удаляем кэш
                    Log.e(TAG, "❌ Failed to decode from memory cache: ${e.message}")
                    null
                }
            } else {
                Log.d(TAG, "⏰ Memory cache EXPIRED: $key")
                memoryCache.remove(key)
            }
        }

        // 2. Проверяем disk cache
        val cacheFile = diskCacheDir.resolve(key.hashCode().toString())
        if (cacheFile.exists()) {
            try {
                val entryJson = cacheFile.readText()
                val entry = Json.decodeFromString<CacheEntry>(entryJson)

                if (System.currentTimeMillis() - entry.timestamp < DEFAULT_TTL) {
                    Log.d(TAG, "✅ Disk cache HIT: $key")

                    // Загружаем в memory cache
                    memoryCache[key] = entry

                    return try {
                        Json.decodeFromString<T>(entry.data)
                    } catch (e: kotlinx.serialization.SerializationException) {
                        // Схема данных изменилась - удаляем из кэша
                        Log.w(TAG, "⚠️ Schema changed, clearing cache for: $key")
                        memoryCache.remove(key)
                        cacheFile.delete()
                        null
                    }
                } else {
                    Log.d(TAG, "⏰ Disk cache EXPIRED: $key")
                    cacheFile.delete()
                }
            } catch (e: kotlinx.serialization.SerializationException) {
                // Схема CacheEntry изменилась или данные повреждены - удаляем
                Log.w(TAG, "⚠️ Cache entry corrupted, clearing: $key")
                memoryCache.remove(key)
                cacheFile.delete()
            } catch (e: Exception) {
                // Другие ошибки (например IOException при чтении файла) - удаляем файл но это не связано со схемой
                Log.e(TAG, "❌ Failed to read from disk cache: ${e.message}")
                cacheFile.delete()
            }
        }

        Log.d(TAG, "❌ Cache MISS: $key")
        return null
    }

    /**
     * Сохранить данные в кэш
     */
    inline fun <reified T> set(key: String, value: T) {
        try {
            val data = Json.encodeToString(value)
            val entry = CacheEntry(data, System.currentTimeMillis())

            // 1. Сохраняем в memory cache
            memoryCache[key] = entry

            // 2. Сохраняем на disk
            val cacheFile = diskCacheDir.resolve(key.hashCode().toString())
            val entryJson = Json.encodeToString(entry)
            cacheFile.writeText(entryJson)

            Log.d(TAG, "💾 Cached: $key (${data.length} bytes)")

            // 3. Проверяем размер disk cache и чистим если превышен лимит
            cleanupDiskCacheIfNeeded()
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to cache: $key - ${e.message}")
        }
    }

    /**
     * Очистить весь кэш
     */
    fun clearAll() {
        // Очищаем memory cache
        memoryCache.clear()

        // Очищаем disk cache
        diskCacheDir.listFiles()?.forEach { it.delete() }

        Log.i(TAG, "🗑️ Cache cleared")
    }

    /**
     * Удалить конкретную запись из кэша
     */
    fun remove(key: String) {
        // Удаляем из memory cache
        memoryCache.remove(key)

        // Удаляем с disk
        val cacheFile = diskCacheDir.resolve(key.hashCode().toString())
        cacheFile.delete()

        Log.d(TAG, "🗑️ Removed from cache: $key")
    }

    /**
     * Проверить и очистить disk cache если превышен лимит
     */
    @PublishedApi
    internal fun cleanupDiskCacheIfNeeded() {
        try {
            val files = diskCacheDir.listFiles() ?: return

            // Подсчитываем общий размер
            var totalSize = files.sumOf { it.length() }

            // Если превышен лимит - удаляем самые старые файлы
            if (totalSize > DISK_CACHE_LIMIT) {
                Log.w(TAG, "⚠️ Disk cache exceeded limit (${totalSize / 1024 / 1024}MB / ${DISK_CACHE_LIMIT / 1024 / 1024}MB)")

                // Сортируем по времени изменения (самые старые первые)
                val sortedFiles = files.sortedBy { it.lastModified() }

                var sizeToRemove = totalSize - DISK_CACHE_LIMIT
                var removedCount = 0

                for (file in sortedFiles) {
                    if (sizeToRemove <= 0) break

                    sizeToRemove -= file.length()
                    file.delete()
                    removedCount++
                }

                Log.i(TAG, "🗑️ Removed $removedCount old cache entries")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to cleanup disk cache: ${e.message}")
        }
    }
}

/**
 * Запись кэша (данные + timestamp)
 */
@kotlinx.serialization.Serializable
@PublishedApi
internal data class CacheEntry(
    val data: String,
    val timestamp: Long
)
