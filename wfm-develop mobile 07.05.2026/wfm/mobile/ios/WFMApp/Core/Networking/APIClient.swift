import Foundation
import os.log
import UIKit
import WFMAuth

/// Generic API Client for handling network requests
actor APIClient {
    private let baseURL: URL
    private let session: URLSession
    private let tokenStorage: TokenStorage
    private let authService: AuthService
    private let cacheManager: CacheManager
    private let logger = Logger(subsystem: "com.wfm", category: "APIClient")

    // Флаг для отключения логирования body в production (защита от утечки токенов/персональных данных)
    private let shouldLogBody: Bool

    private let storeId = "1"  // Временно всегда 1

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.1"
    }

    private var appDomain: String {
        Bundle.main.bundleIdentifier ?? "com.beyondviolet.wfm"
    }

    
    // Кешированный deviceId
    private var _cachedDeviceId: String?

    // Синхронизация обновления токена (защита от race condition)
    private var isRefreshing = false

    // Хранилище для impersonation («Войти как»)
    private let impersonationStorage: ImpersonationStorage

    // Аналитика сетевых запросов
    private let analyticsService: (any AnalyticsService)?
    nonisolated(unsafe) var storeIdProvider: (() -> String?)?

    init(baseURL: URL, impersonationStorage: ImpersonationStorage, analyticsService: (any AnalyticsService)? = nil, cacheManager: CacheManager = CacheManager(), session: URLSession = .shared, shouldLogBody: Bool = true) {
        self.baseURL = baseURL
        self.session = session
        self.tokenStorage = TokenStorage()
        self.authService = AuthService(session: session)
        self.cacheManager = cacheManager
        self.impersonationStorage = impersonationStorage
        self.analyticsService = analyticsService

        #if DEBUG
        self.shouldLogBody = shouldLogBody
        #else
        self.shouldLogBody = false  // В production всегда отключено
        #endif
    }

    /// Получить device ID (обращается к main actor для UIDevice)
    private func getDeviceId() async -> String {
        if let cached = _cachedDeviceId {
            return cached
        }

        let platformName = "IOS"
        let vendorId = await MainActor.run {
            UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
        }
        let deviceId = platformName + vendorId + appDomain
        _cachedDeviceId = deviceId
        return deviceId
    }

    /// Perform GET request
    func get<T: Decodable>(
        path: String,
        queryItems: [URLQueryItem]? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        var urlComponents = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: true)
        urlComponents?.queryItems = queryItems

        guard let url = urlComponents?.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        await addCommonHeaders(to: &request)

        if requiresAuth {
            try await addAuthHeader(to: &request)
        }

        return try await perform(request: request)
    }

    /// Perform POST request
    func post<T: Decodable, Body: Encodable>(
        path: String,
        body: Body? = nil as Empty?,
        requiresAuth: Bool = true
    ) async throws -> T {
        let url = baseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        await addCommonHeaders(to: &request)

        if requiresAuth {
            try await addAuthHeader(to: &request)
        }

        return try await perform(request: request)
    }

    /// Perform PATCH request
    func patch<T: Decodable, Body: Encodable>(
        path: String,
        body: Body,
        requiresAuth: Bool = true
    ) async throws -> T {
        let url = baseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        await addCommonHeaders(to: &request)

        if requiresAuth {
            try await addAuthHeader(to: &request)
        }

        return try await perform(request: request)
    }

    /// Perform DELETE request
    func delete<T: Decodable>(path: String, requiresAuth: Bool = true) async throws -> T {
        let url = baseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        await addCommonHeaders(to: &request)

        if requiresAuth {
            try await addAuthHeader(to: &request)
        }

        return try await perform(request: request)
    }

    /// Perform POST request with multipart/form-data
    func postMultipart<T: Decodable>(
        path: String,
        fields: [String: String],
        image: UIImage?,
        imageFieldName: String,
        imageFileName: String,
        requiresAuth: Bool = true
    ) async throws -> T {
        let url = baseURL.appendingPathComponent(path)
        let boundary = "Boundary-\(UUID().uuidString)"

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30  // 30 секунд для загрузки фото

        await addCommonHeaders(to: &request)

        if requiresAuth {
            try await addAuthHeader(to: &request)
        }

        // Создаём multipart body
        var body = Data()

        // Добавляем текстовые поля
        for (key, value) in fields {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }

        // Добавляем изображение если есть
        if let image = image {
            // Логируем оригинальный размер
            let originalSize = image.size
            logger.debug("📸 Original image size: \(originalSize.width)x\(originalSize.height)")

            // Сжимаем изображение для отправки
            guard let imageData = UIImageCompression.compressForUpload(image: image) else {
                logger.error("❌ Failed to compress image")
                throw APIError.imageProcessingFailed
            }

            let sizeInMB = Double(imageData.count) / 1024.0 / 1024.0
            logger.debug("📦 Compressed image size: \(String(format: "%.2f", sizeInMB)) MB (\(imageData.count) bytes)")

            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(imageFieldName)\"; filename=\"\(imageFileName)\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(imageData)
            body.append("\r\n".data(using: .utf8)!)
        }

        // Закрываем boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        return try await perform(request: request)
    }

    // MARK: - Cached Requests (stale-while-revalidate)

    /// Perform GET request with caching (stale-while-revalidate pattern)
    /// Возвращает поток результатов: сначала из кэша (если есть), затем свежие данные
    func getCached<T: Codable>(
        path: String,
        queryItems: [URLQueryItem]? = nil,
        requiresAuth: Bool = true
    ) -> AsyncStream<CachedResult<T>> {
        return AsyncStream { continuation in
            _Concurrency.Task {
                let cacheKey = CacheManager.cacheKey(path: path, queryItems: queryItems)

                // 1. Проверяем кэш и возвращаем сразу если есть
                if let cachedData: T = await cacheManager.get(key: cacheKey) {
                    logger.debug("📦 Returning cached data for \(path)")
                    continuation.yield(.cached(cachedData))
                }

                // 2. Делаем сетевой запрос для обновления
                do {
                    let freshData: T = try await get(
                        path: path,
                        queryItems: queryItems,
                        requiresAuth: requiresAuth
                    )

                    // 3. Сохраняем в кэш
                    await cacheManager.set(key: cacheKey, value: freshData)

                    // 4. Возвращаем свежие данные
                    logger.debug("🔄 Returning fresh data for \(path)")
                    continuation.yield(.fresh(freshData))
                    continuation.finish()

                } catch {
                    // Если кэш был - уже вернули данные, просто сообщаем об ошибке обновления
                    // Если кэша не было - это единственный результат
                    logger.error("❌ Failed to fetch fresh data for \(path): \(error.localizedDescription)")
                    continuation.yield(.error(error))
                    continuation.finish()
                }
            }
        }
    }

    /// Записать значение в кэш под ключом GET-запроса (path без query params)
    func updateCache<T: Codable>(path: String, value: T) async {
        let key = CacheManager.cacheKey(path: path, queryItems: nil)
        await cacheManager.set(key: key, value: value)
    }

    /// Очистить весь кэш
    func clearCache() async {
        await cacheManager.clearAll()
    }

    // MARK: - Headers

    /// Добавить общие заголовки для Beyond Violet API
    private func addCommonHeaders(to request: inout URLRequest) async {
        let deviceId = await getDeviceId()
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        request.setValue(appVersion, forHTTPHeaderField: "X-App-Version")
        request.setValue(appDomain, forHTTPHeaderField: "X-App-Domain")
        request.setValue(storeId, forHTTPHeaderField: "X-Store-Id")
        request.setValue("XMLHttpRequest", forHTTPHeaderField: "X-Requested-With")

        // Impersonation: хидер X-Auth-By добавляется только если
        // разработчик активировал режим «Войти как» в экране профиля.
        // Сервер игнорирует хидер без flags.dev=true в JWT.
        if let phone = impersonationStorage.phone {
            request.setValue(phone, forHTTPHeaderField: "X-Auth-By")
        }
    }

    /// Добавить заголовок авторизации с автоматическим обновлением токена
    private func addAuthHeader(to request: inout URLRequest) async throws {
        try await ensureValidToken()

        guard let accessToken = try await tokenStorage.getAccessToken() else {
            throw APIError.unauthorized
        }

        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    }

    /// Убедиться что токен валиден, обновить при необходимости
    /// Использует флаг-based синхронизацию (аналог Mutex) для предотвращения параллельных refresh запросов
    private func ensureValidToken() async throws {
        // Если уже идёт обновление - ждём его завершения
        while isRefreshing {
            logger.debug("⏳ Waiting for ongoing token refresh...")
            try await _Concurrency.Task.sleep(nanoseconds: 100_000_000) // 100ms
        }

        // Проверяем истечение токена (может уже обновлён другим запросом)
        guard try await tokenStorage.isTokenExpired() else {
            return  // Токен валиден
        }

        // Повторная проверка флага после await - другой запрос мог начать refresh
        if isRefreshing {
            // Ждём пока не освободится
            while isRefreshing {
                try await _Concurrency.Task.sleep(nanoseconds: 100_000_000) // 100ms
            }
            // После освобождения проверяем токен ещё раз (может уже обновлён)
            guard try await tokenStorage.isTokenExpired() else {
                return  // Токен обновлён другим запросом
            }
        }

        // Захватываем флаг и начинаем обновление
        isRefreshing = true
        logger.info("🔄 Starting token refresh...")

        defer {
            // Освобождаем флаг после завершения (успех или ошибка)
            isRefreshing = false
        }

        // Токен истёк, пытаемся обновить
        guard let refreshToken = try await tokenStorage.getRefreshToken() else {
            logger.error("❌ No refresh token available")
            throw APIError.unauthorized
        }

        do {
            let newTokens = try await authService.refreshToken(refreshToken: refreshToken)
            try await tokenStorage.saveTokens(newTokens)
            logger.info("✅ Token refreshed successfully")
        } catch let authError as AuthError {
            // Проверяем тип ошибки авторизации
            switch authError {
            case .invalidToken, .tokenExpired:
                // Refresh token невалиден или истёк - очищаем токены и требуем повторной авторизации
                logger.error("❌ Refresh token is invalid or expired: \(authError.localizedDescription)")
                try? await tokenStorage.clearTokens()
                throw APIError.unauthorized
            case .networkError:
                // Сетевая ошибка - НЕ удаляем токены, пользователь может повторить позже
                logger.warning("⚠️ Network error during token refresh: \(authError.localizedDescription)")
                throw APIError.serverError
            default:
                // Другие ошибки (captcha, validation и т.д.) - НЕ удаляем токены
                logger.warning("⚠️ Token refresh failed with error: \(authError.localizedDescription)")
                throw APIError.serverError
            }
        } catch {
            // Неизвестная ошибка - НЕ удаляем токены (может быть временная проблема с сетью)
            logger.warning("⚠️ Token refresh failed with unknown error: \(error.localizedDescription)")
            throw APIError.serverError
        }
    }

    /// Generic request performer
    private func perform<T: Decodable>(request: URLRequest) async throws -> T {
        // Логируем запрос
        logRequest(request)

        let start = Date()
        let method = request.httpMethod ?? "UNKNOWN"
        let rawPath = request.url?.path ?? "unknown"

        let data: Data
        let urlResponse: URLResponse

        do {
            (data, urlResponse) = try await session.data(for: request)
        } catch is CancellationError {
            let duration = Int(Date().timeIntervalSince(start) * 1000)
            trackRequest(method: method, rawPath: rawPath, httpStatus: 0, durationMs: duration, isError: false, errorType: "cancelled")
            throw CancellationError()
        } catch let urlError as URLError where urlError.code == .cancelled {
            let duration = Int(Date().timeIntervalSince(start) * 1000)
            trackRequest(method: method, rawPath: rawPath, httpStatus: 0, durationMs: duration, isError: false, errorType: "cancelled")
            throw urlError
        } catch {
            // Сетевая ошибка (connection, DNS, timeout и т.д.)
            let duration = Int(Date().timeIntervalSince(start) * 1000)
            let isTimeout = (error as? URLError)?.code == .timedOut
            trackRequest(method: method, rawPath: rawPath, httpStatus: 0, durationMs: duration, isError: true, errorType: isTimeout ? "timeout" : "network_error")
            throw error
        }

        guard let httpResponse = urlResponse as? HTTPURLResponse else {
            let duration = Int(Date().timeIntervalSince(start) * 1000)
            trackRequest(method: method, rawPath: rawPath, httpStatus: 0, durationMs: duration, isError: true, errorType: "network_error")
            logger.error("❌ Invalid response type")
            throw APIError.invalidResponse
        }

        let statusCode = httpResponse.statusCode
        let duration = Int(Date().timeIntervalSince(start) * 1000)
        let isError = (500...599).contains(statusCode)
        let errorType: String? = statusCode == 502 ? "bad_gateway" : isError ? "server_error" : nil
        trackRequest(method: method, rawPath: rawPath, httpStatus: statusCode, durationMs: duration, isError: isError, errorType: errorType)

        // Логируем ответ
        logResponse(httpResponse, data: data)

        // Проверяем HTTP статус код (500-уровень и т.д.)
        switch httpResponse.statusCode {
        case 200...299:
            // Beyond Violet API: HTTP 200, логические ошибки в status.code
            return try await decodeBVResponse(data: data)
        case 401:
            logger.warning("⚠️ Unauthorized (401)")
            throw APIError.unauthorized
        case 502:
            logger.error("⚠️ Обновление Сервера (\(httpResponse.statusCode))")
            throw APIError.serverUpdate
        case 500...599:
            logger.error("❌ Server Error (\(httpResponse.statusCode))")
            throw APIError.serverError
        default:
            logger.error("❌ Unknown Error (\(httpResponse.statusCode))")
            throw APIError.unknown(statusCode: httpResponse.statusCode)
        }
    }

    // MARK: - Network Telemetry

    /// Нормализует путь URL: заменяет UUID и числовые ID на {id} для группировки в аналитике
    private func normalizePath(_ path: String) -> String {
        var result = path
        let uuidPattern = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
        if let regex = try? NSRegularExpression(pattern: uuidPattern) {
            result = regex.stringByReplacingMatches(
                in: result,
                range: NSRange(result.startIndex..., in: result),
                withTemplate: "{id}"
            )
        }
        let numericPattern = "(?<=/)[0-9]+(?=/|$)"
        if let regex = try? NSRegularExpression(pattern: numericPattern) {
            result = regex.stringByReplacingMatches(
                in: result,
                range: NSRange(result.startIndex..., in: result),
                withTemplate: "{id}"
            )
        }
        return result
    }

    /// Трекинг завершённого HTTP-запроса
    private func trackRequest(method: String, rawPath: String, httpStatus: Int, durationMs: Int, isError: Bool, errorType: String?) {
        let storeId = storeIdProvider?() ?? "unknown"
        analyticsService?.track(.apiRequestCompleted(
            path: normalizePath(rawPath),
            method: method,
            httpStatus: httpStatus,
            durationMs: durationMs,
            storeId: storeId,
            isError: isError,
            errorType: errorType
        ))
    }

    /// Декодировать Beyond Violet API response (BVResponse wrapper)
    private func decodeBVResponse<T: Decodable>(data: Data) async throws -> T {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)

            // Формат: "2025-12-02T05:05:28.762856" (без Z, с микросекундами)
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
            formatter.timeZone = TimeZone(abbreviation: "UTC")
            formatter.locale = Locale(identifier: "en_US_POSIX")

            if let date = formatter.date(from: dateString) {
                return date
            }

            // Fallback на стандартный ISO8601
            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
            if let date = formatter.date(from: dateString) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date string: \(dateString)"
            )
        }

        do {
            // Декодируем как BVResponse<T>
            let bvResponse = try decoder.decode(BVResponse<T>.self, from: data)

            // Проверяем логический статус
            if bvResponse.isSuccess {
                // Успех: извлекаем data
                if let responseData = bvResponse.data {
                    return responseData
                } else {
                    // data is null - проверяем, является ли T опциональным типом
                    // Для опциональных типов (например CurrentShift?) это валидный ответ
                    if isOptionalType(T.self) {
                        // Возвращаем nil как значение опционального типа
                        return Optional<Any>.none as! T
                    } else {
                        // Для не-опциональных типов это ошибка
                        logger.error("❌ Success response but data is null for non-optional type")
                        throw APIError.invalidResponse
                    }
                }
            } else {
                // Ошибка: бросаем ServerResponseError
                logger.error("❌ Server error: \(bvResponse.status.code) - \(bvResponse.status.message ?? "no message")")
                throw ServerResponseError(status: bvResponse.status)
            }
        } catch let error as ServerResponseError {
            // Пробрасываем ServerResponseError как есть
            throw error
        } catch {
            // Ошибка декодирования
            logger.error("❌ Decoding error: \(error.localizedDescription)")
            throw error
        }
    }

    /// Проверяет является ли тип опциональным
    private func isOptionalType(_ type: Any.Type) -> Bool {
        return String(describing: type).contains("Optional")
    }

    // MARK: - Logging Helpers

    /// Логирование исходящего запроса
    private func logRequest(_ request: URLRequest) {
        let method = request.httpMethod ?? "UNKNOWN"
        let url = request.url?.absoluteString ?? "unknown"

        logger.info("📤 \(method) \(url)")

        // Логируем заголовки (маскируем чувствительные данные)
        if let headers = request.allHTTPHeaderFields, !headers.isEmpty {
            logger.debug("Headers: \(headers)")
        }

        // Логируем body только в DEBUG и если разрешено
        if shouldLogBody, let body = request.httpBody {
            if let jsonString = prettyPrintJSON(data: body) {
                logger.debug("Body: \(jsonString)")
            } else {
                logger.debug("Body: \(body.count) bytes")
            }
        }
    }

    /// Логирование полученного ответа
    private func logResponse(_ response: HTTPURLResponse, data: Data) {
        let statusCode = response.statusCode
        let url = response.url?.absoluteString ?? "unknown"

        // Используем разные уровни логирования в зависимости от статуса
        if (200...299).contains(statusCode) {
            logger.info("📥 \(statusCode) \(url) (\(data.count) bytes)")
        } else {
            logger.error("📥 \(statusCode) \(url)")
        }

        // Логируем body только в DEBUG и если разрешено
        if shouldLogBody {
            if let jsonString = prettyPrintJSON(data: data) {
                logger.debug("Response: \(jsonString)")
            } else if let stringData = String(data: data, encoding: .utf8) {
                logger.debug("Response: \(stringData)")
            }
        }
    }

    /// Форматирование JSON для читаемости
    private func prettyPrintJSON(data: Data) -> String? {
        guard let jsonObject = try? JSONSerialization.jsonObject(with: data),
              let prettyData = try? JSONSerialization.data(withJSONObject: jsonObject, options: [.prettyPrinted, .sortedKeys]),
              let prettyString = String(data: prettyData, encoding: .utf8) else {
            return nil
        }
        return prettyString
    }
}

/// Empty body for requests without body
struct Empty: Codable {}

/// Результат кэшированного запроса (stale-while-revalidate pattern)
enum CachedResult<T> {
    /// Данные из кэша (устаревшие, но доступны сразу)
    case cached(T)
    /// Свежие данные с сервера
    case fresh(T)
    /// Ошибка при получении свежих данных
    case error(Error)
}

/// API Error types (HTTP-уровень ошибок)
///
/// Логические ошибки (NOT_FOUND, CONFLICT и т.д.) обрабатываются через ServerResponseError
enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case serverUpdate
    case serverError
    case imageProcessingFailed
    case unknown(statusCode: Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized:
            return "Unauthorized - login required"
        case .serverUpdate:
            return "Обновление сервера"
        case .serverError:
            return "Ошибка на сервере"
        case .imageProcessingFailed:
            return "Не удалось обработать изображение"
        case .unknown(let statusCode):
            return "Unknown error (Status: \(statusCode))"
        }
    }
}

// MARK: - Error Extensions

extension Error {
    /// Проверить является ли ошибка сетевой (не показываем пользователю при наличии кэша)
    /// Сетевые ошибки: timeout, connection errors, DNS errors
    var isNetworkError: Bool {
        // URLError коды
        if let urlError = self as? URLError {
            switch urlError.code {
            case .timedOut, .cannotFindHost, .cannotConnectToHost,
                 .networkConnectionLost, .dnsLookupFailed, .notConnectedToInternet,
                 .secureConnectionFailed, .serverCertificateUntrusted:
                return true
            default:
                break
            }
        }

        // Проверка по тексту ошибки
        let errorDescription = self.localizedDescription.lowercased()
        return errorDescription.contains("timeout") ||
               errorDescription.contains("timed out") ||
               errorDescription.contains("connection") ||
               errorDescription.contains("network") ||
               errorDescription.contains("unreachable") ||
               errorDescription.contains("dns") ||
               errorDescription.contains("no address")
    }

    /// Проверить нужно ли показывать эту ошибку пользователю
    /// Возвращает true если это критичная ошибка (не сетевая)
    var shouldShowToUser: Bool {
        return !isNetworkError
    }
}
