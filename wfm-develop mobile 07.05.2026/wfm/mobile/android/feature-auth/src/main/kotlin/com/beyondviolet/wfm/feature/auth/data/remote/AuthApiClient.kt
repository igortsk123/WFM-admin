package com.beyondviolet.wfm.feature.auth.data.remote

import android.content.Context
import android.provider.Settings
import android.util.Log
import com.beyondviolet.wfm.feature.auth.platform.PlatformInfo
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.*
import io.ktor.client.request.forms.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.serializer
import okhttp3.OkHttpClient

/**
 * API Client для авторизации через Beyond Violet API
 */
class AuthApiClient(
    private val context: Context,
    private val okHttpClient: OkHttpClient
) {

    companion object {
        @PublishedApi
        internal const val TAG = "AuthApiClient"
    }

    // Обязательные заголовки для Beyond Violet API
    @PublishedApi
    internal val deviceId: String
        get() {
            val platformName = PlatformInfo.PLATFORM_CODE
            val androidId = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ANDROID_ID
            ) ?: "unknown"
            val crc32Str = ""
            return platformName + androidId + crc32Str + appDomain
        }

    @PublishedApi
    internal val appVersion: String
        get() = try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "0.0.1"
        } catch (e: Exception) {
            Log.w(TAG, "Failed to get app version", e)
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
            requestTimeoutMillis = 10_000
            connectTimeoutMillis = 10_000
            socketTimeoutMillis = 10_000
        }
    }

    @PublishedApi
    internal val json = Json {
        prettyPrint = true
        isLenient = true
        ignoreUnknownKeys = true
    }

    /**
     * POST запрос с FormUrlEncoded телом
     *
     * Сначала проверяем статус ответа, и только при успехе парсим data.
     * Это нужно потому что при ошибках (AUTH_CAPTCHA_REQUIRED и др.)
     * сервер возвращает data: {} — пустой объект, который нельзя
     * десериализовать в типизированную модель.
     */
    suspend inline fun <reified T> postForm(
        url: String,
        formParameters: Parameters
    ): ApiResponse<T> {
        return try {
            val response: HttpResponse = httpClient.post(url) {
                contentType(ContentType.Application.FormUrlEncoded)
                setBody(FormDataContent(formParameters))

                // Обязательные заголовки Beyond Violet
                header("X-Device-Id", deviceId)
                header("X-App-Version", appVersion)
                header("X-App-Domain", appDomain)
                header("X-Store-Id", storeId)
                header("X-Requested-With", "XMLHttpRequest")
            }

            // Обрабатываем специфичные HTTP статусы которые не возвращают JSON
            if (response.status.value == 429) {
                return ApiResponse.Error("TOO_MANY_REQUESTS", "Слишком много попыток. Попробуйте позже")
            }

            // Читаем body как текст (можно прочитать только один раз)
            val bodyText = response.bodyAsText()

            // Сначала парсим с JsonElement чтобы проверить статус
            // без требования к структуре data
            val statusResponse = json.decodeFromString<BVResponse<JsonElement>>(bodyText)

            if (!statusResponse.status?.code.isNullOrEmpty()) {
                // Ошибка — код не пустой, возвращаем ошибку без парсинга data
                return ApiResponse.Error(
                    statusResponse.status?.code ?: "unknown_error",
                    statusResponse.status?.message ?: "Unknown error"
                )
            }

            // Успех — теперь парсим полный ответ с типизированной data
            val bvResponse = json.decodeFromString<BVResponse<T>>(bodyText)
            bvResponse.data?.let {
                ApiResponse.Success(it)
            } ?: ApiResponse.Error("", "No data in successful response")
        } catch (e: Exception) {
            Log.e(TAG, "API error", e)
            ApiResponse.Error("NETWORK_ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * POST запрос для регистрации (возвращает данные напрямую, без обёртки BVResponse)
     */
    suspend inline fun <reified T> postFormDirect(
        url: String,
        formParameters: Parameters
    ): ApiResponse<T> {
        return try {
            val response: HttpResponse = httpClient.post(url) {
                contentType(ContentType.Application.FormUrlEncoded)
                setBody(FormDataContent(formParameters))

                // Обязательные заголовки Beyond Violet
                header("X-Device-Id", deviceId)
                header("X-App-Version", appVersion)
                header("X-App-Domain", appDomain)
                header("X-Store-Id", storeId)
                header("X-Requested-With", "XMLHttpRequest")
            }

            when (response.status.value) {
                200 -> {
                    val data: T = response.body()
                    ApiResponse.Success(data)
                }
                429 -> ApiResponse.Error("TOO_MANY_REQUESTS", "Слишком много попыток. Попробуйте позже")
                else -> {
                    val bodyText = response.bodyAsText()
                    // Пробуем распарсить JSON-ошибку через status.code/message
                    try {
                        val statusResponse = json.decodeFromString<BVResponse<JsonElement>>(bodyText)
                        if (!statusResponse.status?.code.isNullOrEmpty()) {
                            ApiResponse.Error(
                                statusResponse.status!!.code!!,
                                statusResponse.status.message ?: bodyText
                            )
                        } else {
                            ApiResponse.Error("HTTP_${response.status.value}", bodyText)
                        }
                    } catch (e: Exception) {
                        ApiResponse.Error("HTTP_${response.status.value}", bodyText)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "API error", e)
            ApiResponse.Error("NETWORK_ERROR", e.message ?: "Unknown error")
        }
    }

    fun close() {
        httpClient.close()
    }
}
