package com.beyondviolet.wfm.core.network

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.beyondviolet.wfm.core.managers.ImpersonationStorage
import com.beyondviolet.wfm.core.platform.PlatformInfo
import com.beyondviolet.wfm.core.models.auth.RefreshToken
import com.beyondviolet.wfm.core.models.auth.TokenData
import com.beyondviolet.wfm.feature.auth.data.local.TokenStorage
import com.beyondviolet.wfm.feature.auth.data.remote.AuthApiClient
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.timeout
import io.ktor.client.request.*
import io.ktor.client.request.forms.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.http.content.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import java.util.UUID

/**
 * API Client для взаимодействия с бэкендом
 * Поддерживает автоматическое обновление токенов
 */
class ApiClient(
    private val context: Context,
    @PublishedApi
    //DEV#@ //вум№"
    internal val baseUrl: String = "https://wfm.beyondviolet.com",
    //internal val baseUrl: String = "https://dev.wfm.beyondviolet.com",
    @PublishedApi
    internal val tokenStorage: TokenStorage,
    private val okHttpClient: OkHttpClient,
    private val impersonationStorage: ImpersonationStorage,
    @PublishedApi
    internal val cacheManager: CacheManager,
    private val analyticsService: com.beyondviolet.wfm.core.analytics.AnalyticsService? = null
) {
    var storeIdProvider: (() -> String?)? = null
    @PublishedApi
    internal val tokenRefreshMutex = Mutex()

    // Обязательные заголовки для Beyond Violet API
    val deviceId: String
        get() {
            val platformName = PlatformInfo.PLATFORM_CODE

            val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"

            //calc crc32
            var crc32Str = ""
            /*val crc32 = CRC32()
            crc32.update(deviceId.toByteArray());
            crc32Str = String.format("%08X", crc32.value);*/
            //----------

            return platformName + deviceId + crc32Str + appDomain
        }

    @PublishedApi
    internal val appVersion: String
        get() = try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "0.0.1"
        } catch (e: Exception) {
            Log.w(Companion.TAG, "Failed to get app version", e)
            "0.0.1"
        }

    @PublishedApi
    internal val appDomain: String
        get() = context.packageName

    @PublishedApi
    internal val storeId: String = "1"


    @PublishedApi
    internal val httpClient = HttpClient(OkHttp) {
        engine {
            preconfigured = okHttpClient
        }
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
        install(Logging) {
            logger = object : Logger {
                override fun log(message: String) {
                    Log.d(TAG, message)
                }
            }
            level = LogLevel.ALL
        }
        install(HttpTimeout) {
            requestTimeoutMillis = 10_000  // 10 секунд (дефолт)
            connectTimeoutMillis = 10_000  // 10 секунд
            socketTimeoutMillis = 10_000   // 10 секунд (дефолт)
        }
    }

    companion object {
        @PublishedApi
        internal const val TAG = "ApiClient"
    }

    /**
     * Проверка HTTP статус-кода и возврат ошибки при необходимости
     * Соответствует логике iOS APIClient
     * @return ApiResponse.Error если нужно обработать ошибку, null если статус 200-299
     */
    @PublishedApi
    internal fun checkHttpStatus(response: HttpResponse): ApiResponse.Error? {
        return when (response.status.value) {
            in 200..299 -> {
                // OK - обрабатываем ответ дальше
                null
            }
            401 -> {
                Log.w(TAG, "⚠️ Unauthorized (401)")
                ApiResponse.Error("unauthorized", "Необходима авторизация")
            }
            502 -> {
                Log.e(TAG, "⚠️ Обновление Сервера (502)")
                ApiResponse.Error("server_update", "Обновление сервера")
            }
            in 500..599 -> {
                Log.e(TAG, "❌ Server Error (${response.status.value})")
                ApiResponse.Error("server_error", "Ошибка на сервере")
            }
            else -> {
                Log.e(TAG, "❌ Unknown Error (${response.status.value})")
                ApiResponse.Error("unknown_error", "Неизвестная ошибка (Статус: ${response.status.value})")
            }
        }
    }

    /**
     * GET запрос с автоматической обработкой формата сервера
     */
    suspend inline fun <reified T> get(
        path: String,
        queryParams: Map<String, String> = emptyMap(),
        requiresAuth: Boolean = true
    ): ApiResponse<T> {
        val start = System.currentTimeMillis()
        return try {
            if (requiresAuth) {
                ensureValidToken()
            }

            val response: HttpResponse = httpClient.get("$baseUrl$path") {
                addCommonHeaders(this)
                queryParams.forEach { (key, value) ->
                    parameter(key, value)
                }
                if (requiresAuth) {
                    addAuthHeader(this)
                }
            }

            val statusCode = response.status.value
            val duration = (System.currentTimeMillis() - start).toInt()
            val isError = statusCode in 500..599
            val errorType: String? = when (statusCode) { 502 -> "bad_gateway"; in 500..599 -> "server_error"; else -> null }
            trackRequest("GET", path, statusCode, duration, isError, errorType)

            // Проверка HTTP статус-кода перед обработкой
            checkHttpStatus(response)?.let { return it }

            handleServerResponse(response)
        } catch (e: kotlinx.coroutines.CancellationException) {
            val duration = (System.currentTimeMillis() - start).toInt()
            trackRequest("GET", path, 0, duration, false, "cancelled")
            throw e
        } catch (e: Exception) {
            val duration = (System.currentTimeMillis() - start).toInt()
            val isTimeout = e.message?.contains("timeout", ignoreCase = true) == true
            trackRequest("GET", path, 0, duration, true, if (isTimeout) "timeout" else "network_error")
            Log.d(TAG, "RESPONSE $baseUrl$path failed with exception: $e")
            ApiResponse.Error("network_error", e.message ?: "Unknown error")
        }
    }

    /**
     * GET запрос с прямым парсингом (без обёртки ServerResponse)
     * Используется для WFM API, который возвращает данные напрямую
     */
    suspend inline fun <reified T> getDirect(
        path: String,
        queryParams: Map<String, String> = emptyMap(),
        requiresAuth: Boolean = true
    ): ApiResponse<T> {
        val start = System.currentTimeMillis()
        return try {
            if (requiresAuth) {
                ensureValidToken()
            }

            val response: HttpResponse = httpClient.get("$baseUrl$path") {
                addCommonHeaders(this)
                queryParams.forEach { (key, value) ->
                    parameter(key, value)
                }
                if (requiresAuth) {
                    addAuthHeader(this)
                }
            }

            val statusCode = response.status.value
            val duration = (System.currentTimeMillis() - start).toInt()
            val isError = statusCode in 500..599
            val errorType: String? = when (statusCode) { 502 -> "bad_gateway"; in 500..599 -> "server_error"; else -> null }
            trackRequest("GET", path, statusCode, duration, isError, errorType)

            // Проверка HTTP статус-кода перед обработкой
            checkHttpStatus(response)?.let { return it }

            // Прямой парсинг без обёртки ServerResponse
            val data: T = response.body()
            ApiResponse.Success(data)
        } catch (e: kotlinx.coroutines.CancellationException) {
            val duration = (System.currentTimeMillis() - start).toInt()
            trackRequest("GET", path, 0, duration, false, "cancelled")
            throw e
        } catch (e: Exception) {
            val duration = (System.currentTimeMillis() - start).toInt()
            val isTimeout = e.message?.contains("timeout", ignoreCase = true) == true
            trackRequest("GET", path, 0, duration, true, if (isTimeout) "timeout" else "network_error")
            Log.d(TAG, "RESPONSE $baseUrl$path failed with exception: $e")
            ApiResponse.Error("network_error", e.message ?: "Unknown error")
        }
    }

    /**
     * GET запрос с кэшированием (stale-while-revalidate pattern)
     * Возвращает Flow который emit'ит результаты: сначала из кэша (если есть), затем свежие данные
     */
    inline fun <reified T> getCached(
        path: String,
        queryParams: Map<String, String> = emptyMap(),
        requiresAuth: Boolean = true
    ): Flow<ApiResponse<T>> = flow {
        val cacheKey = CacheManager.cacheKey(path, queryParams)

        // 1. Проверяем кэш и возвращаем сразу если есть
        val cachedData: T? = cacheManager.get(cacheKey)
        if (cachedData != null) {
            Log.d(TAG, "📦 Returning cached data for $path")
            emit(ApiResponse.Success(cachedData, isCached = true))
        }

        // 2. Делаем сетевой запрос для обновления
        val freshResponse = get<T>(path, queryParams, requiresAuth)

        when (freshResponse) {
            is ApiResponse.Success -> {
                // 3. Сохраняем в кэш
                cacheManager.set(cacheKey, freshResponse.data)

                // 4. Возвращаем свежие данные
                Log.d(TAG, "🔄 Returning fresh data for $path")
                emit(ApiResponse.Success(freshResponse.data, isCached = false))
            }
            is ApiResponse.Error -> {
                // Если кэш был - уже вернули данные, просто сообщаем об ошибке обновления
                // Если кэша не было - это единственный результат
                Log.e(TAG, "❌ Failed to fetch fresh data for $path: ${freshResponse.message}")
                emit(freshResponse)
            }
        }
    }

    /**
     * Записать значение в кэш под ключом GET-запроса (path без query params)
     */
    inline fun <reified T> updateCache(path: String, value: T) {
        val key = CacheManager.cacheKey(path)
        cacheManager.set(key, value)
    }

    /**
     * Очистить весь кэш
     */
    fun clearCache() {
        cacheManager.clearAll()
    }

    /**
     * POST запрос с автоматической обработкой формата сервера
     */
    suspend inline fun <reified T, reified R> post(
        path: String,
        body: T? = null,
        requiresAuth: Boolean = true
    ): ApiResponse<R> {
        val start = System.currentTimeMillis()
        return try {
            if (requiresAuth) {
                ensureValidToken()
            }

            val response: HttpResponse = httpClient.post("$baseUrl$path") {
                addCommonHeaders(this)
                contentType(ContentType.Application.Json)
                if (requiresAuth) {
                    addAuthHeader(this)
                }
                body?.let { setBody(it) }
            }

            val statusCode = response.status.value
            val duration = (System.currentTimeMillis() - start).toInt()
            val isError = statusCode in 500..599
            val errorType: String? = when (statusCode) { 502 -> "bad_gateway"; in 500..599 -> "server_error"; else -> null }
            trackRequest("POST", path, statusCode, duration, isError, errorType)

            // Проверка HTTP статус-кода перед обработкой
            checkHttpStatus(response)?.let { return it }

            handleServerResponse(response)
        } catch (e: kotlinx.coroutines.CancellationException) {
            val duration = (System.currentTimeMillis() - start).toInt()
            trackRequest("POST", path, 0, duration, false, "cancelled")
            throw e
        } catch (e: Exception) {
            val duration = (System.currentTimeMillis() - start).toInt()
            val isTimeout = e.message?.contains("timeout", ignoreCase = true) == true
            trackRequest("POST", path, 0, duration, true, if (isTimeout) "timeout" else "network_error")
            Log.d(TAG, "RESPONSE $baseUrl$path failed with exception: $e")
            ApiResponse.Error("network_error", e.message ?: "Unknown error")
        }
    }

    /**
     * POST запрос с прямым парсингом (без обёртки ServerResponse)
     * Используется для WFM API, который возвращает данные напрямую
     */
    suspend inline fun <reified T, reified R> postDirect(
        path: String,
        body: T? = null,
        requiresAuth: Boolean = true
    ): ApiResponse<R> {
        val start = System.currentTimeMillis()
        return try {
            if (requiresAuth) {
                ensureValidToken()
            }

            val response: HttpResponse = httpClient.post("$baseUrl$path") {
                addCommonHeaders(this)
                contentType(ContentType.Application.Json)
                if (requiresAuth) {
                    addAuthHeader(this)
                }
                body?.let { setBody(it) }
            }

            val statusCode = response.status.value
            val duration = (System.currentTimeMillis() - start).toInt()
            val isError = statusCode in 500..599
            val errorType: String? = when (statusCode) { 502 -> "bad_gateway"; in 500..599 -> "server_error"; else -> null }
            trackRequest("POST", path, statusCode, duration, isError, errorType)

            // Проверка HTTP статус-кода перед обработкой
            checkHttpStatus(response)?.let { return it }

            // Прямой парсинг без обёртки ServerResponse
            val data: R = response.body()
            ApiResponse.Success(data)
        } catch (e: kotlinx.coroutines.CancellationException) {
            val duration = (System.currentTimeMillis() - start).toInt()
            trackRequest("POST", path, 0, duration, false, "cancelled")
            throw e
        } catch (e: Exception) {
            val duration = (System.currentTimeMillis() - start).toInt()
            val isTimeout = e.message?.contains("timeout", ignoreCase = true) == true
            trackRequest("POST", path, 0, duration, true, if (isTimeout) "timeout" else "network_error")
            Log.d(TAG, "RESPONSE $baseUrl$path failed with exception: $e")
            ApiResponse.Error("network_error", e.message ?: "Unknown error")
        }
    }

    /**
     * PATCH запрос с автоматической обработкой формата сервера
     */
    suspend inline fun <reified T, reified R> patch(
        path: String,
        body: T,
        requiresAuth: Boolean = true
    ): ApiResponse<R> {
        val start = System.currentTimeMillis()
        return try {
            if (requiresAuth) {
                ensureValidToken()
            }

            val response: HttpResponse = httpClient.patch("$baseUrl$path") {
                addCommonHeaders(this)
                contentType(ContentType.Application.Json)
                if (requiresAuth) {
                    addAuthHeader(this)
                }
                setBody(body)
            }

            val statusCode = response.status.value
            val duration = (System.currentTimeMillis() - start).toInt()
            val isError = statusCode in 500..599
            val errorType: String? = when (statusCode) { 502 -> "bad_gateway"; in 500..599 -> "server_error"; else -> null }
            trackRequest("PATCH", path, statusCode, duration, isError, errorType)

            // Проверка HTTP статус-кода перед обработкой
            checkHttpStatus(response)?.let { return it }

            handleServerResponse(response)
        } catch (e: kotlinx.coroutines.CancellationException) {
            val duration = (System.currentTimeMillis() - start).toInt()
            trackRequest("PATCH", path, 0, duration, false, "cancelled")
            throw e
        } catch (e: Exception) {
            val duration = (System.currentTimeMillis() - start).toInt()
            val isTimeout = e.message?.contains("timeout", ignoreCase = true) == true
            trackRequest("PATCH", path, 0, duration, true, if (isTimeout) "timeout" else "network_error")
            Log.d(TAG, "RESPONSE $baseUrl$path failed with exception: $e")
            ApiResponse.Error("network_error", e.message ?: "Unknown error")
        }
    }

    /**
     * PATCH запрос с прямым парсингом (без обёртки ServerResponse)
     * Используется для WFM API, который возвращает данные напрямую
     */
    suspend inline fun <reified T, reified R> patchDirect(
        path: String,
        body: T,
        requiresAuth: Boolean = true
    ): ApiResponse<R> {
        val start = System.currentTimeMillis()
        return try {
            if (requiresAuth) {
                ensureValidToken()
            }

            val response: HttpResponse = httpClient.patch("$baseUrl$path") {
                addCommonHeaders(this)
                contentType(ContentType.Application.Json)
                if (requiresAuth) {
                    addAuthHeader(this)
                }
                setBody(body)
            }

            val statusCode = response.status.value
            val duration = (System.currentTimeMillis() - start).toInt()
            val isError = statusCode in 500..599
            val errorType: String? = when (statusCode) { 502 -> "bad_gateway"; in 500..599 -> "server_error"; else -> null }
            trackRequest("PATCH", path, statusCode, duration, isError, errorType)

            // Проверка HTTP статус-кода перед обработкой
            checkHttpStatus(response)?.let { return it }

            // Прямой парсинг без обёртки ServerResponse
            val data: R = response.body()
            ApiResponse.Success(data)
        } catch (e: kotlinx.coroutines.CancellationException) {
            val duration = (System.currentTimeMillis() - start).toInt()
            trackRequest("PATCH", path, 0, duration, false, "cancelled")
            throw e
        } catch (e: Exception) {
            val duration = (System.currentTimeMillis() - start).toInt()
            val isTimeout = e.message?.contains("timeout", ignoreCase = true) == true
            trackRequest("PATCH", path, 0, duration, true, if (isTimeout) "timeout" else "network_error")
            Log.d(TAG, "RESPONSE $baseUrl$path failed with exception: $e")
            ApiResponse.Error("network_error", e.message ?: "Unknown error")
        }
    }

    /**
     * DELETE запрос с автоматической обработкой формата сервера
     */
    suspend inline fun <reified T> delete(
        path: String,
        requiresAuth: Boolean = true
    ): ApiResponse<T> {
        val start = System.currentTimeMillis()
        return try {
            if (requiresAuth) {
                ensureValidToken()
            }

            val response: HttpResponse = httpClient.delete("$baseUrl$path") {
                addCommonHeaders(this)
                if (requiresAuth) {
                    addAuthHeader(this)
                }
            }

            val statusCode = response.status.value
            val duration = (System.currentTimeMillis() - start).toInt()
            val isError = statusCode in 500..599
            val errorType: String? = when (statusCode) { 502 -> "bad_gateway"; in 500..599 -> "server_error"; else -> null }
            trackRequest("DELETE", path, statusCode, duration, isError, errorType)

            checkHttpStatus(response)?.let { return it }

            handleServerResponse(response)
        } catch (e: kotlinx.coroutines.CancellationException) {
            val duration = (System.currentTimeMillis() - start).toInt()
            trackRequest("DELETE", path, 0, duration, false, "cancelled")
            throw e
        } catch (e: Exception) {
            val duration = (System.currentTimeMillis() - start).toInt()
            val isTimeout = e.message?.contains("timeout", ignoreCase = true) == true
            trackRequest("DELETE", path, 0, duration, true, if (isTimeout) "timeout" else "network_error")
            Log.d(TAG, "RESPONSE $baseUrl$path failed with exception: $e")
            ApiResponse.Error("network_error", e.message ?: "Unknown error")
        }
    }

    /**
     * POST запрос с FormUrlEncoded данными
     */
    suspend inline fun <reified R> postForm(
        path: String,
        formParameters: Parameters,
        requiresAuth: Boolean = false
    ): ApiResponse<R> {
        return try {
            if (requiresAuth) {
                ensureValidToken()
            }

            val fullUrl = "$baseUrl$path"
            Log.d(TAG, "=== POST Form Request ===")
            Log.d(TAG, "URL: $fullUrl")
            Log.d(TAG, "Parameters: ${formParameters.entries().joinToString(", ") { "${it.key}=${it.value}" }}")

            val response: HttpResponse = httpClient.post(fullUrl) {
                addCommonHeaders(this)
                contentType(ContentType.Application.FormUrlEncoded)
                if (requiresAuth) {
                    addAuthHeader(this)
                }
                setBody(FormDataContent(formParameters))
            }

            val responseBody = response.bodyAsText()
            Log.d(TAG, "=== POST Form Response ===")
            Log.d(TAG, "Status: ${response.status}")
            Log.d(TAG, "Body: $responseBody")

            // Проверка HTTP статус-кода перед обработкой
            checkHttpStatus(response)?.let { return it }

            handleServerResponse(response, responseBody)
        } catch (e: Exception) {
            Log.e(TAG, "=== POST Form Error ===", e)
            ApiResponse.Error("network_error", e.message ?: "Unknown error")
        }
    }

    /**
     * POST запрос с FormUrlEncoded данными на полный URL (не через baseUrl)
     */
    suspend inline fun <reified R> postFormFullUrl(
        url: String,
        formParameters: Parameters,
        requiresAuth: Boolean = false
    ): ApiResponse<R> {
        return try {
            if (requiresAuth) {
                ensureValidToken()
            }

            Log.d(TAG, "=== POST Form Request ===")
            Log.d(TAG, "URL: $url")
            Log.d(TAG, "Parameters: ${formParameters.entries().joinToString(", ") { "${it.key}=${it.value}" }}")

            val response: HttpResponse = httpClient.post(url) {
                addCommonHeaders(this)
                contentType(ContentType.Application.FormUrlEncoded)
                if (requiresAuth) {
                    addAuthHeader(this)
                }
                setBody(FormDataContent(formParameters))
            }

            val responseBody = response.bodyAsText()
            Log.d(TAG, "=== POST Form Response ===")
            Log.d(TAG, "Status: ${response.status}")
            Log.d(TAG, "Body: $responseBody")

            // Проверка HTTP статус-кода перед обработкой
            checkHttpStatus(response)?.let { return it }

            handleServerResponse(response, responseBody)
        } catch (e: Exception) {
            Log.e(TAG, "=== POST Form Error ===", e)
            ApiResponse.Error("network_error", e.message ?: "Unknown error")
        }
    }

    /**
     * POST запрос с multipart/form-data для отправки изображений
     */
    suspend inline fun <reified R> postMultipart(
        path: String,
        fields: Map<String, String> = emptyMap(),
        imageData: ByteArray? = null,
        imageFieldName: String = "report_image",
        imageFileName: String = "image.jpg",
        requiresAuth: Boolean = true
    ): ApiResponse<R> {
        val start = System.currentTimeMillis()
        return try {
            if (requiresAuth) {
                ensureValidToken()
            }

            val response: HttpResponse = httpClient.submitFormWithBinaryData(
                url = "$baseUrl$path",
                formData = formData {
                    // Добавляем текстовые поля
                    fields.forEach { (key, value) ->
                        append(key, value)
                    }

                    // Добавляем изображение если есть
                    imageData?.let { data ->
                        append(imageFieldName, data, Headers.build {
                            append(HttpHeaders.ContentType, "image/jpeg")
                            append(HttpHeaders.ContentDisposition, "filename=\"$imageFileName\"")
                        })
                    }
                }
            ) {
                addCommonHeaders(this)
                if (requiresAuth) {
                    addAuthHeader(this)
                }
                // Увеличиваем таймаут до 30 секунд для загрузки фото
                timeout {
                    requestTimeoutMillis = 30_000
                    socketTimeoutMillis = 30_000
                }
            }

            val statusCode = response.status.value
            val duration = (System.currentTimeMillis() - start).toInt()
            val isError = statusCode in 500..599
            val errorType: String? = when (statusCode) { 502 -> "bad_gateway"; in 500..599 -> "server_error"; else -> null }
            trackRequest("POST", path, statusCode, duration, isError, errorType)

            // Проверка HTTP статус-кода перед обработкой
            checkHttpStatus(response)?.let { return it }

            handleServerResponse(response)
        } catch (e: kotlinx.coroutines.CancellationException) {
            val duration = (System.currentTimeMillis() - start).toInt()
            trackRequest("POST", path, 0, duration, false, "cancelled")
            throw e
        } catch (e: Exception) {
            val duration = (System.currentTimeMillis() - start).toInt()
            val isTimeout = e.message?.contains("timeout", ignoreCase = true) == true
            trackRequest("POST", path, 0, duration, true, if (isTimeout) "timeout" else "network_error")
            Log.e(TAG, "=== POST Multipart Error ===", e)
            ApiResponse.Error("network_error", e.message ?: "Unknown error")
        }
    }

    /**
     * Обработка ответа сервера в формате {status, data}
     */
    @PublishedApi
    internal suspend inline fun <reified T> handleServerResponse(response: HttpResponse): ApiResponse<T> {
        return try {
            val serverResponse: ServerResponse<T> = response.body()

            if (serverResponse.status?.code.isNullOrEmpty()) {
                // Успех - код пустой или null
                if (serverResponse.data != null) {
                    ApiResponse.Success(serverResponse.data)
                } else {
                    // data is null - проверяем, является ли T nullable типом
                    // Для nullable типов (например CurrentShift?) это валидный ответ
                    if (null is T) {
                        // T is nullable, возвращаем Success с null
                        @Suppress("UNCHECKED_CAST")
                        ApiResponse.Success(null as T)
                    } else {
                        // T is not nullable, это ошибка
                        ApiResponse.Error("empty_data", "Data field is null for non-nullable type")
                    }
                }
            } else {
                // Ошибка - есть код
                ApiResponse.Error(
                    serverResponse.status?.code ?: "unknown_error",
                    serverResponse.status?.message ?: "Unknown error"
                )
            }
        } catch (e: Exception) {
            ApiResponse.Error("parse_error", e.message ?: "Failed to parse response")
        }
    }

    /**
     * Обработка ответа сервера в формате {status, data} с уже прочитанным телом
     */
    @PublishedApi
    internal inline fun <reified T> handleServerResponse(response: HttpResponse, responseBody: String): ApiResponse<T> {
        return try {
            val json = Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            }

            // Сначала парсим только status
            val statusOnly: StatusOnly = json.decodeFromString(responseBody)

            Log.d(TAG, "Status code: '${statusOnly.status?.code}', message: '${statusOnly.status?.message}'")

            if (statusOnly.status?.code.isNullOrEmpty()) {
                // Успех - код пустой или null, парсим data
                Log.d(TAG, "Parsing response body to type: ${T::class.simpleName}")
                val serverResponse: ServerResponse<T> = json.decodeFromString(responseBody)

                if (serverResponse.data != null) {
                    Log.d(TAG, "Success with data")
                    ApiResponse.Success(serverResponse.data)
                } else {
                    // data is null - проверяем, является ли T nullable типом
                    // Для nullable типов (например CurrentShift?) это валидный ответ
                    if (null is T) {
                        Log.d(TAG, "Success with null data (nullable type)")
                        // T is nullable, возвращаем Success с null
                        @Suppress("UNCHECKED_CAST")
                        ApiResponse.Success(null as T)
                    } else {
                        Log.e(TAG, "Success but data field is null for non-nullable type")
                        ApiResponse.Error("empty_data", "Data field is null for non-nullable type")
                    }
                }
            } else {
                // Ошибка - есть код, не парсим data
                Log.e(TAG, "Server error: ${statusOnly.status?.code} - ${statusOnly.status?.message}")
                ApiResponse.Error(
                    statusOnly.status?.code ?: "unknown_error",
                    statusOnly.status?.message ?: "Unknown error"
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Parse error", e)
            ApiResponse.Error("parse_error", e.message ?: "Failed to parse response")
        }
    }

    /**
     * Добавить обязательные заголовки согласно спецификации Beyond Violet API
     */
    @PublishedApi
    internal fun addCommonHeaders(builder: HttpRequestBuilder) {
        builder.header("X-Device-Id", deviceId)
        builder.header("X-App-Version", appVersion)
        builder.header("X-App-Domain", appDomain)
        builder.header("X-Store-Id", storeId)
        builder.header("X-Requested-With", "XMLHttpRequest")

        // Impersonation: хидер X-Auth-By добавляется только если
        // разработчик активировал режим «Войти как» в экране профиля.
        // Сервер игнорирует хидер без flags.dev=true в JWT.
        impersonationStorage.currentPhone?.let { phone ->
            builder.header("X-Auth-By", phone)
        }
    }

    /**
     * Добавить заголовок Authorization с токеном
     */
    @PublishedApi
    internal suspend fun addAuthHeader(builder: HttpRequestBuilder) {
        val token = tokenStorage.getAccessToken()
        if (token != null) {
            builder.header("Authorization", "Bearer $token")
        }
    }

    /**
     * Проверить и обновить токен при необходимости
     */
    @PublishedApi
    internal suspend fun ensureValidToken() {
        tokenRefreshMutex.withLock {
            if (tokenStorage.isTokenExpired()) {
                val refreshToken = tokenStorage.getRefreshToken()
                if (refreshToken != null) {
                    try {
                        refreshTokenInternal(refreshToken)
                        // Успешно обновили токен
                    } catch (e: InvalidTokenException) {
                        // Refresh token невалиден - очищаем токены и требуем повторной авторизации
                        Log.e(TAG, "❌ Refresh token is invalid, clearing tokens")
                        tokenStorage.clearTokens()
                        throw UnauthorizedException("Refresh token is invalid or expired")
                    } catch (e: Exception) {
                        // Другие ошибки (сеть, таймаут, сервер) - НЕ удаляем токены
                        Log.w(TAG, "⚠️ Failed to refresh token, but keeping tokens for retry: ${e.message}")
                        throw e
                    }
                } else {
                    Log.e(TAG, "❌ No refresh token available")
                    throw UnauthorizedException("No refresh token available")
                }
            }
        }
    }

    /**
     * Внутренний метод обновления токена
     * Использует FormUrlEncoded запрос к BeyondViolet API
     *
     * @throws InvalidTokenException если refresh token невалиден (401)
     * @throws Exception при других ошибках (сеть, таймаут, сервер)
     */
    private suspend fun refreshTokenInternal(refreshToken: String) {
        Log.d(TAG, "🔄 Starting token refresh...")
        Log.d(TAG, "📤 POST https://api.beyondviolet.com/oauth/token/")
        Log.d(TAG, "Headers:")
        Log.d(TAG, "  X-Store-Id: $storeId")
        Log.d(TAG, "  X-App-Domain: $appDomain")
        Log.d(TAG, "  X-Requested-With: XMLHttpRequest")
        Log.d(TAG, "  X-App-Version: $appVersion")
        Log.d(TAG, "  Content-Type: application/x-www-form-urlencoded")
        Log.d(TAG, "  X-Device-Id: $deviceId")
        Log.d(TAG, "Body: refresh_token=${refreshToken}&app_id=15&grant_type=refresh_token")

        try {
            val parameters = Parameters.build {
                append("grant_type", "refresh_token")
                append("app_id", "15")
                append("refresh_token", refreshToken)
            }

            val response: HttpResponse = httpClient.post("https://api.beyondviolet.com/oauth/token/") {
                addCommonHeaders(this)
                contentType(ContentType.Application.FormUrlEncoded)
                setBody(FormDataContent(parameters))
            }

            Log.d(TAG, "📥 Response status: ${response.status.value}")

            // Проверяем HTTP статус код
            when (response.status.value) {
                401 -> {
                    // Refresh token невалиден или истёк
                    Log.e(TAG, "❌ Refresh token is invalid (401)")
                    throw InvalidTokenException("Refresh token is invalid or expired")
                }
                in 500..599 -> {
                    // Ошибка сервера - НЕ удаляем токены
                    Log.e(TAG, "❌ Server error (${response.status.value})")
                    throw Exception("Server error: ${response.status.value}")
                }
            }

            val serverResponse: ServerResponse<TokenData> = response.body()

            if (serverResponse.status?.code.isNullOrEmpty() && serverResponse.data != null) {
                tokenStorage.saveTokens(
                    serverResponse.data.access_token,
                    serverResponse.data.refresh_token,
                    serverResponse.data.expires_in
                )
                Log.d(TAG, "✅ Token refreshed successfully")
            } else {
                // Логическая ошибка от сервера (в теле ответа)
                val errorCode = serverResponse.status?.code ?: "unknown"
                val errorMessage = serverResponse.status?.message ?: "Unknown error"
                Log.e(TAG, "❌ Server returned error: $errorCode - $errorMessage")

                // Если ошибка связана с токеном - бросаем InvalidTokenException
                if (errorCode == "invalid_token" || errorCode == "token_expired" || errorCode == "invalid_grant") {
                    throw InvalidTokenException("Refresh token is invalid: $errorMessage")
                } else {
                    // Другие ошибки - НЕ удаляем токены
                    throw Exception("Server error: $errorCode - $errorMessage")
                }
            }
        } catch (e: InvalidTokenException) {
            // Пробрасываем InvalidTokenException как есть
            throw e
        } catch (e: Exception) {
            // Сетевые ошибки, таймауты и т.д. - НЕ удаляем токены
            Log.e(TAG, "❌ Failed to refresh token: ${e.message}", e)
            throw e
        }
    }

    // MARK: - Network Telemetry

    /**
     * Нормализует путь: UUID и числовые ID заменяются на {id} для группировки в аналитике
     */
    @PublishedApi
    internal fun normalizePath(path: String): String {
        return path
            .replace(Regex("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"), "{id}")
            .replace(Regex("(?<=/)[0-9]+(?=/|$)"), "{id}")
    }

    /**
     * Трекинг завершённого HTTP-запроса
     */
    @PublishedApi
    internal fun trackRequest(method: String, path: String, httpStatus: Int, durationMs: Int, isError: Boolean, errorType: String?) {
        val storeId = storeIdProvider?.invoke() ?: "unknown"
        analyticsService?.track(
            com.beyondviolet.wfm.core.analytics.AnalyticsEvent.ApiRequestCompleted(
                path = normalizePath(path),
                method = method,
                httpStatus = httpStatus,
                durationMs = durationMs,
                storeId = storeId,
                isError = isError,
                errorType = errorType
            )
        )
    }

    fun close() {
        httpClient.close()
    }
}

/**
 * Исключение для случая когда токен невалиден (требуется повторная авторизация)
 */
class InvalidTokenException(message: String) : Exception(message)
