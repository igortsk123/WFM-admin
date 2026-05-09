package com.beyondviolet.wfm.feature.auth.di

import com.beyondviolet.wfm.feature.auth.data.local.TokenStorage
import com.beyondviolet.wfm.feature.auth.data.remote.AuthApiClient
import com.beyondviolet.wfm.feature.auth.data.remote.AuthService
import com.beyondviolet.wfm.feature.auth.presentation.viewmodels.AuthViewModel
import com.beyondviolet.wfm.ui.components.ToastManager
import org.koin.android.ext.koin.androidContext
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

/**
 * Koin DI модуль для фичи авторизации
 *
 * Инкапсулирует все зависимости модуля auth
 */
val authModule = module {
    // Data layer - Local
    single { TokenStorage(androidContext()) }

    // Data layer - Remote
    single { AuthApiClient(androidContext(), get()) }
    single { AuthService(get()) }

    // Presentation layer
    viewModel { AuthViewModel(get(), get(), androidContext(), get()) }
}
