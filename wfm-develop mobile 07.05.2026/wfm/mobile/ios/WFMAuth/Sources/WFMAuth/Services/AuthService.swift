import Foundation
import UIKit
import os.log

/// Сервис авторизации для работы с Beyond Violet OAuth2 API
public actor AuthService {
    //DEV#@ //вум№"
    private let baseURL = URL(string: "https://api.beyondviolet.com")!
    private let registrationURL = URL(string: "https://shopping.beyondviolet.com")!
    private let appId = "15"  // App ID для WFM
    private let APP_SECRET = "25f4db1436f767a9b1dc75c0e38a5bfb" // App Secret для WFM
    private let session: URLSession
    private let logger = Logger(subsystem: "com.beyondviolet.wfm", category: "AuthService")

    // Обязательные заголовки для Beyond Violet API
    private let storeId = "1"  // Временно всегда 1

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.1"
    }

    private var appDomain: String {
        Bundle.main.bundleIdentifier ?? "com.beyondviolet.wfm"
    }

    private var deviceId: String {
        get async {
            let platformName = "IOS"
            let vendorId = await MainActor.run {
                UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
            }
            let crc32Str = ""
            return platformName + vendorId + crc32Str + appDomain
        }
    }

    public init(session: URLSession = .shared) {
        self.session = session
    }

    // MARK: - Public API

    /// Запросить код подтверждения для существующего пользователя
    public func requestCode(
        phone: String,
        notificationType: NotificationType,
        captcha: String? = nil
    ) async throws -> CodeSentResponse {
        var params: [String: Any] = [
            "phone": phone,
            "response_type": notificationType.rawValue
        ]

        if let captcha = captcha {
            params["captcha"] = captcha
        }

        let response: BVResponse<CodeSentResponse> = try await postFormURLEncoded(
            url: baseURL.appendingPathComponent("/oauth/authorize/"),
            parameters: params
        )

        return try handleBVResponse(response)
    }

    /// Запросить код для регистрации нового пользователя
    public func requestRegistrationCode(
        phone: String,
        notificationType: NotificationType,
        captcha: String? = nil
    ) async throws -> CodeSentResponse {
        var params: [String: Any] = [
            "phone": phone,
            "response_type": notificationType.rawValue,
            "signup": "1"
        ]
        if let captcha = captcha {
            params["captcha"] = captcha
        }

        let response: BVResponse<CodeSentResponse> = try await postFormURLEncoded(
            url: baseURL.appendingPathComponent("/oauth/authorize/"),
            parameters: params
        )

        return try handleBVResponse(response)
    }

    /// Подтвердить код и получить токены
    public func verifyCode(phone: String, code: String) async throws -> TokenResponse {
        let params: [String: Any] = [
            "grant_type": "phone_code",
            "app_id": appId,
            "app_secret": APP_SECRET,
            "phone": phone,
            "code": code
        ]

        let response: BVResponse<TokenResponse> = try await postFormURLEncoded(
            url: baseURL.appendingPathComponent("/oauth/token/"),
            parameters: params
        )

        return try handleBVResponse(response)
    }

    /// Зарегистрировать нового пользователя
    public func register(data: RegistrationData) async throws -> RegistrationResponse {
        // Кодируем данные в form-urlencoded
        let params: [String: Any] = [
            "app_id": data.appId,
            "phone": data.phone,
            "code": data.code,
            "first_name": data.firstName,
            "last_name": data.lastName,
            "gender": data.gender,
            "city_id": data.cityId,
            "birth_date": data.birthDate,
            "device_name": data.deviceName
        ]

        // Регистрация возвращает данные напрямую, без обёртки BVResponse
        let response: RegistrationResponse = try await postFormURLEncoded(
            url: registrationURL.appendingPathComponent("/api/account/register"),
            parameters: params
        )

        return response
    }

    /// Обновить access token используя refresh token
    public func refreshToken(refreshToken: String) async throws -> TokenResponse {
        let params: [String: Any] = [
            "grant_type": "refresh_token",
            "app_id": appId,
            "refresh_token": refreshToken
        ]

        let response: BVResponse<TokenResponse> = try await postFormURLEncoded(
            url: baseURL.appendingPathComponent("/oauth/token/"),
            parameters: params
        )

        return try handleBVResponse(response)
    }

    // MARK: - Private Helpers

    /// Добавить обязательные заголовки согласно спецификации Beyond Violet API
    private func addCommonHeaders(to request: inout URLRequest) async {
        let deviceId = await deviceId
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        request.setValue(appVersion, forHTTPHeaderField: "X-App-Version")
        request.setValue(appDomain, forHTTPHeaderField: "X-App-Domain")
        request.setValue(storeId, forHTTPHeaderField: "X-Store-Id")
        request.setValue("XMLHttpRequest", forHTTPHeaderField: "X-Requested-With")
        //request.setValue("wfm", forHTTPHeaderField: "X-Auth-Scheme")
    }

    /// Выполнить POST запрос с form-urlencoded телом
    private func postFormURLEncoded<T: Decodable>(
        url: URL,
        parameters: [String: Any],
        unwrapData: Bool = true
    ) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        // Добавляем обязательные заголовки
        await addCommonHeaders(to: &request)

        // Кодируем параметры - конвертируем Any в String
        var components = URLComponents()
        components.queryItems = parameters.map { key, value in
            let stringValue = String(describing: value)
            return URLQueryItem(name: key, value: stringValue)
        }
        request.httpBody = components.percentEncodedQuery?.data(using: .utf8)

        // Детальное логирование запроса
        logger.info("📤 POST \(url.absoluteString)")
        logger.debug("Headers:")
        request.allHTTPHeaderFields?.forEach { key, value in
            logger.debug("  \(key): \(value)")
        }
        if let bodyString = request.httpBody.flatMap({ String(data: $0, encoding: .utf8) }) {
            logger.debug("Body: \(bodyString)")
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            logger.error("❌ Invalid response type")
            throw AuthError.networkError
        }

        // Детальное логирование ответа
        let responseBody = String(data: data, encoding: .utf8) ?? "<не удалось декодировать>"

        logger.info("📥 \(httpResponse.statusCode) \(url.absoluteString)")
        logger.debug("Response body: \(responseBody)")

        if httpResponse.statusCode != 200 {
            logger.error("⚠️ Non-200 status code: \(httpResponse.statusCode)")
            logger.error("Response headers:")
            httpResponse.allHeaderFields.forEach { key, value in
                logger.error("  \(key): \(value as! NSObject)")
            }
        }

        // Обрабатываем специфичные HTTP статусы которые не возвращают JSON
        if httpResponse.statusCode == 429 {
            throw AuthError.unknown("Слишком много попыток. Попробуйте позже")
        }

        // ВАЖНО: Сначала пытаемся декодировать JSON, даже при не-200 статусах
        // Beyond Violet API может возвращать HTTP 403/404 с валидным JSON,
        // содержащим status.code (например, AUTH_CAPTCHA_REQUIRED)
        let decoder = JSONDecoder()
        do {
            return try decoder.decode(T.self, from: data)
        } catch let authError as AuthError {
            // Кастомные декодеры (например, RegistrationResponse) могут бросать AuthError напрямую
            throw authError
        } catch {
            // Если не получилось декодировать JSON - тогда бросаем ошибку по HTTP коду
            logger.error("❌ Failed to decode JSON: \(error)")
            throw AuthError.unknown("HTTP \(httpResponse.statusCode): \(responseBody)")
        }
    }

    /// Обработать обёрнутый ответ Beyond Violet API
    private func handleBVResponse<T>(_ response: BVResponse<T>) throws -> T {
        // Проверяем статус
        if !response.status.code.isEmpty {
            // Есть ошибка
            let message = response.status.message ?? ""
            logger.error("❌ Beyond Violet error: \(response.status.code) - \(message)")
            throw AuthError(code: response.status.code, message: message)
        }

        // Проверяем наличие данных
        guard let data = response.data else {
            logger.error("❌ No data in successful response")
            throw AuthError.unknown("No data in successful response")
        }

        return data
    }

    /// Получить название устройства для iOS
    public static func getDeviceName() async -> String {
        let (device, systemVersion) = await MainActor.run {
            let device = UIDevice.current
            return (device, device.systemVersion)
        }

        // Получаем модель устройства
        var systemInfo = utsname()
        uname(&systemInfo)
        let modelCode = withUnsafePointer(to: &systemInfo.machine) {
            $0.withMemoryRebound(to: CChar.self, capacity: 1) {
                String(validatingUTF8: $0)
            }
        }

        let model = modelCode ?? "Unknown"
        return "Apple \(model) iOS:\(systemVersion)"
    }
}
