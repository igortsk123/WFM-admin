plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    // Плагины google-services и agconnect применяются в конце файла
}

android {
    namespace = "com.beyondviolet.wfm"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.beyondviolet.wfm"
        minSdk = 26
        targetSdk = 35
        versionCode = 13
        versionName = "1.1.0"
        multiDexEnabled = true

        vectorDrawables {
            useSupportLibrary = true
        }
    }

    flavorDimensions += listOf("brand", "services")

    productFlavors {
        // Бренд «ХВ Сотрудник» — штатные сотрудники LAMA
        create("hv") {
            dimension = "brand"
            // applicationId наследуется из defaultConfig: com.beyondviolet.wfm
            buildConfigField("String", "APPMETRICA_KEY", "\"5f8b6de7-383c-4c32-af2a-45b0f1a4e426\"")
        }
        // Бренд «Умный Сотрудник» — внешние/временные сотрудники
        create("smart") {
            dimension = "brand"
            applicationId = "com.bv.wfm"
            buildConfigField("String", "APPMETRICA_KEY", "\"c9f56324-6c86-4d61-98a9-b51e80d6f268\"")
        }

        create("gms") {
            dimension = "services"
        }
        create("hms") {
            dimension = "services"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Feature modules
    implementation(project(":ui"))
    implementation(project(":feature-auth"))

    // AndroidX Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.multidex)

    // Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.navigation.compose)

    // Ktor HTTP Client
    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.kotlinx.json)
    implementation(libs.ktor.client.logging)
    implementation(libs.ktor.client.websockets)

    // OkHttp
    implementation(libs.okhttp)

    // Koin DI
    implementation(libs.koin.android)
    implementation(libs.koin.androidx.compose)

    // Kotlinx
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.datetime)

    // DataStore
    implementation(libs.androidx.datastore.preferences)

    // hCaptcha
    implementation(libs.hcaptcha.sdk)

    // Chucker (HTTP inspector)
    debugImplementation(libs.chucker.library)
    releaseImplementation(libs.chucker.library.no.op)

    // Coil (Image loading)
    implementation(libs.coil.compose)

    // ZXing (QR code generation)
    implementation(libs.zxing.core)

    // ExifInterface (для корректировки ориентации фото)
    implementation(libs.androidx.exifinterface)

    // Firebase (GMS only)
    "gmsImplementation"(platform(libs.firebase.bom))
    "gmsImplementation"(libs.firebase.analytics)
    "gmsImplementation"(libs.firebase.crashlytics)
    "gmsImplementation"(libs.firebase.messaging)

    // HMS (Huawei)
    "hmsImplementation"(libs.hms.push)
    "hmsImplementation"(libs.hms.agconnect.core)
    "hmsImplementation"(libs.appmetrica.analytics)

    // Semetrics Analytics SDK
    implementation("com.github.trombocit:semetrics-android:1225f04550")

    // Debug
    debugImplementation(libs.androidx.ui.tooling)
}

// Копируем конфигурационные файлы из flavor-specific папок в корень модуля
// Это необходимо потому что плагины google-services и agconnect ищут файлы в корне

// Для IDE синхронизации копируем GMS конфигурацию по умолчанию
val gmsConfigSource = file("src/gms/google-services.json")
val gmsConfigTarget = file("google-services.json")
if (gmsConfigSource.exists() && !gmsConfigTarget.exists()) {
    gmsConfigSource.copyTo(gmsConfigTarget, overwrite = false)
}

// Регистрируем задачи копирования
val copyGmsConfig = tasks.register("copyGmsConfig") {
    doFirst {
        val sourceFile = file("src/gms/google-services.json")
        val targetFile = file("google-services.json")
        if (sourceFile.exists()) {
            sourceFile.copyTo(targetFile, overwrite = true)
        }
    }
}

// HMS-конфиги per-brand: у HV и Smart разные аккаунты в AppGallery Connect,
// поэтому файлы лежат в src/hvHms/ и src/smartHms/ и копируются по варианту.
val copyHvHmsConfig = tasks.register("copyHvHmsConfig") {
    doFirst {
        val sourceFile = file("src/hvHms/agconnect-services.json")
        val targetFile = file("agconnect-services.json")
        if (sourceFile.exists()) {
            sourceFile.copyTo(targetFile, overwrite = true)
        }
    }
}

val copySmartHmsConfig = tasks.register("copySmartHmsConfig") {
    doFirst {
        val sourceFile = file("src/smartHms/agconnect-services.json")
        val targetFile = file("agconnect-services.json")
        if (sourceFile.exists()) {
            sourceFile.copyTo(targetFile, overwrite = true)
        }
    }
}

// Применяем плагины после конфигурации Android extension
pluginManager.withPlugin("com.android.application") {
    if (file("src/gms/google-services.json").exists()) {
        apply(plugin = "com.google.gms.google-services")
        apply(plugin = "com.google.firebase.crashlytics")
    }
    if (file("src/hvHms/agconnect-services.json").exists() ||
        file("src/smartHms/agconnect-services.json").exists()) {
        apply(plugin = "com.huawei.agconnect")
    }
}

// Привязываем копирование к preBuild задачам
afterEvaluate {
    android.applicationVariants.configureEach {
        val variantName = name
        val capitalizedName = variantName.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        val preBuildTask = tasks.findByName("pre${capitalizedName}Build")

        when {
            variantName.contains("Gms", ignoreCase = true) -> preBuildTask?.dependsOn(copyGmsConfig)
            variantName.contains("hvHms", ignoreCase = true) -> preBuildTask?.dependsOn(copyHvHmsConfig)
            variantName.contains("smartHms", ignoreCase = true) -> preBuildTask?.dependsOn(copySmartHmsConfig)
        }
    }

    // AGConnect-плагин применяется глобально, но валидирует package_name
    // в agconnect-services.json для всех вариантов. Для GMS-вариантов это лишнее
    // и приводит к ошибке при сборке HV-GMS, если в корне лежит smart-конфиг.
    tasks.matching { it.name.contains("AGCPlugin") && it.name.contains("Gms", ignoreCase = true) }
        .configureEach { enabled = false }
}
