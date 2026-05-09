import Foundation
import os.log

/// Управляет кэшированием HTTP ответов (in-memory + disk)
actor CacheManager {
    private let logger = Logger(subsystem: "com.wfm", category: "CacheManager")

    // TTL кэша (7 дней)
    private let defaultTTL: TimeInterval = 60 * 60 * 24 * 7

    // In-memory cache
    private let memoryCache = NSCache<NSString, CacheEntry>()

    // Disk cache directory
    private let diskCacheURL: URL

    // Максимальный размер in-memory cache (50 MB)
    private let memoryCacheLimit = 50 * 1024 * 1024

    // Максимальный размер disk cache (100 MB)
    private let diskCacheLimit = 100 * 1024 * 1024

    init() {
        // Настройка in-memory cache
        memoryCache.totalCostLimit = memoryCacheLimit

        // Настройка disk cache
        let cacheDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        diskCacheURL = cacheDirectory.appendingPathComponent("com.wfm.http-cache", isDirectory: true)

        // Создаём директорию если не существует
        try? FileManager.default.createDirectory(at: diskCacheURL, withIntermediateDirectories: true)

        logger.info("📦 CacheManager initialized (TTL: \(self.defaultTTL)s, Memory: \(self.memoryCacheLimit / 1024 / 1024)MB, Disk: \(self.diskCacheLimit / 1024 / 1024)MB)")
    }

    /// Получить данные из кэша
    func get<T: Decodable>(key: String) -> T? {
        // 1. Проверяем in-memory cache
        if let entry = memoryCache.object(forKey: key as NSString) {
            // Проверяем не истёк ли TTL
            if Date().timeIntervalSince(entry.timestamp) < defaultTTL {
                logger.debug("✅ Memory cache HIT: \(key)")
                do {
                    return try JSONDecoder().decode(T.self, from: entry.data)
                } catch is DecodingError {
                    // Схема данных изменилась - удаляем из кэша
                    logger.warning("⚠️ Schema changed, clearing memory cache for: \(key)")
                    memoryCache.removeObject(forKey: key as NSString)
                    // Также удаляем с диска
                    let fileURL = diskCacheURL.appendingPathComponent(key.sha256())
                    try? FileManager.default.removeItem(at: fileURL)
                    return nil
                } catch {
                    // Другие ошибки - не удаляем кэш
                    logger.error("❌ Failed to decode from memory cache: \(error.localizedDescription)")
                    return nil
                }
            } else {
                logger.debug("⏰ Memory cache EXPIRED: \(key)")
                memoryCache.removeObject(forKey: key as NSString)
            }
        }

        // 2. Проверяем disk cache
        let fileURL = diskCacheURL.appendingPathComponent(key.sha256())

        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            logger.debug("❌ Cache MISS: \(key)")
            return nil
        }

        do {
            let data = try Data(contentsOf: fileURL)
            let entry = try JSONDecoder().decode(CacheEntry.self, from: data)

            // Проверяем не истёк ли TTL
            if Date().timeIntervalSince(entry.timestamp) < defaultTTL {
                logger.debug("✅ Disk cache HIT: \(key)")

                // Загружаем в memory cache
                memoryCache.setObject(entry, forKey: key as NSString, cost: entry.data.count)

                do {
                    return try JSONDecoder().decode(T.self, from: entry.data)
                } catch is DecodingError {
                    // Схема данных изменилась - удаляем из кэша
                    logger.warning("⚠️ Schema changed, clearing cache for: \(key)")
                    memoryCache.removeObject(forKey: key as NSString)
                    try? FileManager.default.removeItem(at: fileURL)
                    return nil
                }
            } else {
                logger.debug("⏰ Disk cache EXPIRED: \(key)")
                try? FileManager.default.removeItem(at: fileURL)
            }
        } catch is DecodingError {
            // Схема CacheEntry изменилась или данные повреждены - удаляем
            logger.warning("⚠️ Cache entry corrupted, clearing: \(key)")
            memoryCache.removeObject(forKey: key as NSString)
            try? FileManager.default.removeItem(at: fileURL)
        } catch {
            // Другие ошибки (например IO при чтении файла) - удаляем файл но это не связано со схемой
            logger.error("❌ Failed to read from disk cache: \(error.localizedDescription)")
            try? FileManager.default.removeItem(at: fileURL)
        }

        logger.debug("❌ Cache MISS: \(key)")
        return nil
    }

    /// Сохранить данные в кэш
    func set<T: Encodable>(key: String, value: T) {
        do {
            let data = try JSONEncoder().encode(value)
            let entry = CacheEntry(data: data, timestamp: Date())

            // 1. Сохраняем в memory cache
            memoryCache.setObject(entry, forKey: key as NSString, cost: data.count)

            // 2. Сохраняем на disk
            let fileURL = diskCacheURL.appendingPathComponent(key.sha256())
            let entryData = try JSONEncoder().encode(entry)
            try entryData.write(to: fileURL)

            logger.debug("💾 Cached: \(key) (\(data.count) bytes)")

            // 3. Проверяем размер disk cache и чистим если превышен лимит (в фоне)
            _Concurrency.Task {
                await cleanupDiskCacheIfNeeded()
            }
        } catch {
            logger.error("❌ Failed to cache: \(key) - \(error.localizedDescription)")
        }
    }

    /// Очистить весь кэш
    func clearAll() {
        // Очищаем memory cache
        memoryCache.removeAllObjects()

        // Очищаем disk cache
        try? FileManager.default.removeItem(at: diskCacheURL)
        try? FileManager.default.createDirectory(at: diskCacheURL, withIntermediateDirectories: true)

        logger.info("🗑️ Cache cleared")
    }

    /// Удалить конкретную запись из кэша
    func remove(key: String) {
        // Удаляем из memory cache
        memoryCache.removeObject(forKey: key as NSString)

        // Удаляем с disk
        let fileURL = diskCacheURL.appendingPathComponent(key.sha256())
        try? FileManager.default.removeItem(at: fileURL)

        logger.debug("🗑️ Removed from cache: \(key)")
    }

    /// Проверить и очистить disk cache если превышен лимит
    private func cleanupDiskCacheIfNeeded() async {
        do {
            let files = try FileManager.default.contentsOfDirectory(
                at: self.diskCacheURL,
                includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey],
                options: .skipsHiddenFiles
            )

            // Подсчитываем общий размер
            var totalSize = 0
            var fileInfos: [(url: URL, size: Int, date: Date)] = []

            for fileURL in files {
                let attributes = try FileManager.default.attributesOfItem(atPath: fileURL.path)
                let size = attributes[.size] as? Int ?? 0
                let date = attributes[.modificationDate] as? Date ?? Date.distantPast

                totalSize += size
                fileInfos.append((url: fileURL, size: size, date: date))
            }

            // Если превышен лимит - удаляем самые старые файлы
            if totalSize > self.diskCacheLimit {
                self.logger.warning("⚠️ Disk cache exceeded limit (\(totalSize / 1024 / 1024)MB / \(self.diskCacheLimit / 1024 / 1024)MB)")

                // Сортируем по дате (самые старые первые)
                fileInfos.sort { $0.date < $1.date }

                var sizeToRemove = totalSize - self.diskCacheLimit
                var removedCount = 0

                for fileInfo in fileInfos {
                    if sizeToRemove <= 0 { break }

                    try? FileManager.default.removeItem(at: fileInfo.url)
                    sizeToRemove -= fileInfo.size
                    removedCount += 1
                }

                self.logger.info("🗑️ Removed \(removedCount) old cache entries")
            }
        } catch {
            self.logger.error("❌ Failed to cleanup disk cache: \(error.localizedDescription)")
        }
    }

    /// Генерирует ключ кэша из URL и query params
    static func cacheKey(path: String, queryItems: [URLQueryItem]?) -> String {
        var key = path

        if let queryItems = queryItems, !queryItems.isEmpty {
            let sortedQuery = queryItems
                .sorted { $0.name < $1.name }
                .map { "\($0.name)=\($0.value ?? "")" }
                .joined(separator: "&")
            key += "?" + sortedQuery
        }

        return key
    }
}

/// Запись кэша (данные + timestamp)
private class CacheEntry: Codable {
    let data: Data
    let timestamp: Date

    init(data: Data, timestamp: Date) {
        self.data = data
        self.timestamp = timestamp
    }
}

// MARK: - String Extension для SHA256
extension String {
    func sha256() -> String {
        // Простая хэш-функция для генерации имени файла
        // В production лучше использовать CryptoKit
        return String(self.hashValue)
    }
}
