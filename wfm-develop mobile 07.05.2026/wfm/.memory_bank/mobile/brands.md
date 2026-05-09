# Бренды приложений WFM

WFM выпускается под двумя брендами с единой кодовой базой.

## Умный Сотрудник

- **Целевая аудитория**: внешние и временные сотрудники (подработчики, самозанятые, не в штате)
- **Партнёры**: LAMA (первичный), другие партнёры в будущем
- **Позиционирование**: основное/общее приложение платформы
- **iOS Bundle ID**: `com.bv.wfm` (iOS target: `WFMApp`)
- **Android Application ID**: `com.bv.wfm` (Android flavor: `smart`)
- **Публикация**: от имени BeyondViolet

## ХВ Сотрудник

- **Целевая аудитория**: штатные сотрудники партнёра LAMA
- **Партнёры**: только LAMA (приложение не используется другими партнёрами)
- **iOS Bundle ID**: `com.beyondviolet.rost.wfm` (iOS target: `HVApp`)
- **Android Application ID**: `com.beyondviolet.wfm` (Android flavor: `hv`)
- **Публикация**: от имени LAMA / BeyondViolet

## Общая кодовая база

Оба приложения работают на одном коде. Различия:
- Название приложения (app_name / CFBundleDisplayName)
- Иконка приложения
- Bundle ID / Application ID (следовательно, push-уведомления, deep links, FCM токены)

## Реализация — iOS

Два отдельных Xcode target, подключающих одни и те же исходные файлы:
- `WFMApp` — Умный Сотрудник; xcconfig: `Configs/Smart.xcconfig`; иконка: `AppIcon`
- `HVApp` — ХВ Сотрудник; xcconfig: `Configs/HV.xcconfig`; иконка: `AppIconHV`

Конфиги: `WFMApp/Configs/HV.xcconfig` и `WFMApp/Configs/Smart.xcconfig`

Каждый target также имеет свой WFMNotificationService extension:
- `com.bv.wfm.WFMNotificationService` (для WFMApp / Умный Сотрудник)
- `com.beyondviolet.rost.wfm.WFMNotificationService` (для HVApp / ХВ Сотрудник, TODO)

## Реализация — Android

Два flavor dimension: `brand` × `services` (gms/hms).

| Flavor | applicationId | app_name |
|--------|--------------|----------|
| `hv` | `com.beyondviolet.wfm` | ХВ Сотрудник |
| `smart` | `com.bv.wfm` | Умный Сотрудник |

Итоговые варианты сборки: `hvGms`, `hvHms`, `smartGms`, `smartHms` (× Debug/Release).

Flavor-специфичные ресурсы:
- `src/hv/res/values/strings.xml` — app_name для ХВ
- `src/smart/res/values/strings.xml` — app_name для Умный Сотрудник
- `src/smart/res/mipmap-*/` — иконки (TODO: добавить после дизайна)
- `src/smartGms/google-services.json` — Firebase config для com.bv.wfm (TODO)

## Firebase и Push-уведомления

Для Smart (com.bv.wfm) требуется отдельная Firebase регистрация:
- Зарегистрировать `com.bv.wfm` в Firebase Console (Android и iOS)
- Android: добавить `src/smartGms/google-services.json` с com.bv.wfm
- iOS: добавить APNs ключ/сертификат для com.bv.wfm в Firebase
- Apple Developer: создать provisioning profile для `com.bv.wfm`
- Apple Developer: зарегистрировать новый App ID `com.bv.wfm`
