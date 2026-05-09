package com.beyondviolet.wfm.core.di

import com.chuckerteam.chucker.api.ChuckerCollector
import com.chuckerteam.chucker.api.ChuckerInterceptor
import com.chuckerteam.chucker.api.RetentionManager
import com.beyondviolet.wfm.core.crashlytics.CrashlyticsService
import com.beyondviolet.wfm.core.crashlytics.CrashlyticsServiceFactory
import com.beyondviolet.wfm.core.managers.ImpersonationStorage
import com.beyondviolet.wfm.core.managers.UserManager
import com.beyondviolet.wfm.core.network.ApiClient
import com.beyondviolet.wfm.core.network.CacheManager
import com.beyondviolet.wfm.core.network.ShiftsService
import com.beyondviolet.wfm.core.network.TasksService
import com.beyondviolet.wfm.core.network.UserService
import com.beyondviolet.wfm.core.notifications.NotificationsApiService
import com.beyondviolet.wfm.core.notifications.NotificationsWebSocketService
import com.beyondviolet.wfm.features.tasks.presentation.viewmodels.TasksListViewModel
import com.beyondviolet.wfm.features.tasks.presentation.viewmodels.TaskDetailsViewModel
import com.beyondviolet.wfm.features.home.HomeViewModel
import com.beyondviolet.wfm.features.home.HomeUserRole
import com.beyondviolet.wfm.features.managertasks.ManagerTasksListViewModel
import com.beyondviolet.wfm.features.settings.SettingsViewModel
import com.beyondviolet.wfm.ui.components.ToastManager
import okhttp3.OkHttpClient
import org.koin.android.ext.koin.androidContext
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module
import java.util.concurrent.TimeUnit

/**
 * Koin DI модуль приложения
 */
val appModule = module {
    // Storage (TokenStorage теперь из feature-auth модуля)
    // Нет необходимости создавать заново, используем из authModule

    // Chucker collector для хранения логов
    single {
        ChuckerCollector(
            context = androidContext(),
            showNotification = true,
            retentionPeriod = RetentionManager.Period.ONE_HOUR
        )
    }

    // Chucker interceptor для логирования HTTP запросов
    single {
        ChuckerInterceptor.Builder(androidContext())
            .collector(get())
            .maxContentLength(250_000L)  // Максимальная длина тела запроса/ответа
            .alwaysReadResponseBody(true)  // Всегда читать тело ответа
            .build()
    }

    // OkHttpClient с Chucker interceptor
    single {
        OkHttpClient.Builder()
            .addInterceptor(get<ChuckerInterceptor>())
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .writeTimeout(10, TimeUnit.SECONDS)
            .build()
    }

    // Impersonation storage
    single { ImpersonationStorage(androidContext()) }

    // Cache
    single { CacheManager(androidContext()) }

    // Network
    single {
        val koin = getKoin()
        ApiClient(
            context = androidContext(),
            tokenStorage = get(),
            okHttpClient = get(),
            impersonationStorage = get(),
            cacheManager = get(),
            analyticsService = get()
        ).also { client ->
            // storeIdProvider разрешает UserManager лениво — избегает циклической зависимости
            client.storeIdProvider = {
                koin.getOrNull<UserManager>()?.currentAssignment?.value?.store?.id?.toString()
            }
        }
    }
    single { TasksService(get()) }
    single { UserService(get()) }
    single { ShiftsService(get()) }
    single { NotificationsApiService(get()) }
    single { NotificationsWebSocketService(tokenStorage = get(), baseUrl = get<ApiClient>().baseUrl, analyticsService = get()) }

    // Managers
    single { UserManager(get(), get(), get()) }  // userService, shiftsService, tokenStorage
    single { ToastManager() }

    // Crashlytics - flavor-specific (GMS: Firebase, HMS: AppMetrica)
    single<CrashlyticsService> { CrashlyticsServiceFactory.create(androidContext()) }

    // Analytics - теперь flavor-specific (см. gms/hms analyticsModule)
    // GMS: Firebase + Semetrics
    // HMS: HMS + Semetrics

    // ViewModels (Home feature) - unified for worker and manager
    viewModel { (role: HomeUserRole) ->
        HomeViewModel(
            role = role,
            userManager = get(),
            tasksService = get(),
            toastManager = get(),
            analyticsService = get()
        )
    }

    // ViewModels (Manager Tasks feature)
    viewModel { ManagerTasksListViewModel(get(), get(), get(), get()) }  // userManager, tasksService, toastManager, analyticsService

    // ViewModels (Tasks feature)
    viewModel { TasksListViewModel(get(), get(), get(), get()) }  // tasksService, userManager, toastManager, analyticsService
    viewModel { (taskId: String) -> TaskDetailsViewModel(androidContext(), get(), taskId, get(), get()) }  // context, tasksService, taskId, toastManager, analyticsService

    // ViewModels (Settings feature)
    viewModel { SettingsViewModel(get(), get(), get(), get(), get(), get()) }  // userManager, toastManager, tokenStorage, impersonationStorage, analyticsService, userService
}
