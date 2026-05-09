# План: Выпуск приложения «Умный Сотрудник»

**Статус:** В работе
**Создан:** 2026-04-27
**Последнее обновление:** 2026-04-27

---

## Цель

Добавить в iOS и Android проекты поддержку второго бренда. Оба приложения используют единую кодовую базу, различаются только названием и иконкой.

- **«Умный Сотрудник»** (`com.bv.wfm`) — основное/общее приложение, для внешних/временных сотрудников LAMA и будущих партнёров. На iOS это существующий `WFMApp` target.
- **«ХВ Сотрудник»** (`com.beyondviolet.rost.wfm` / `com.beyondviolet.wfm`) — для штатных сотрудников LAMA. На iOS новый `HVApp` target.

## Задачи

### Документация

- [x] Создать `.memory_bank/mobile/brands.md` — 2026-04-27
- [ ] Обновить CLAUDE.md — добавить ссылку на brands.md в таблицу mobile документации

### Android

- [x] Добавить flavor dimension `brand` (hv/smart) в `app/build.gradle.kts` — 2026-04-27
- [x] Создать `src/hv/res/values/strings.xml` — app_name = "ХВ Сотрудник" — 2026-04-27
- [x] Создать `src/smart/res/values/strings.xml` — app_name = "Умный Сотрудник" — 2026-04-27
- [ ] Добавить иконки `src/smart/res/mipmap-*/` (после получения дизайна)
- [ ] Зарегистрировать `com.bv.wfm` в Firebase Console
- [ ] Создать `src/smartGms/google-services.json` для com.bv.wfm
- [ ] Проверить сборку всех 8 вариантов (hvGms/hvHms/smartGms/smartHms × Debug/Release)

### iOS

- [x] Создать `WFMApp/Configs/HV.xcconfig` — 2026-04-27
- [x] Создать `WFMApp/Configs/Smart.xcconfig` — 2026-04-27
- [x] Создать `AppIconHV.appiconset` (placeholder) в Assets.xcassets — 2026-04-27
- [ ] **[Xcode UI]** Применить `Smart.xcconfig` к target `WFMApp` (Debug + Release) → bundle ID станет `com.bv.wfm`, name "Умный Сотрудник"
- [ ] **[Xcode UI]** Обновить bundle ID `WFMNotificationService` extension → `com.bv.wfm.WFMNotificationService`
- [ ] **[Xcode UI]** Создать target `HVApp` — см. инструкцию ниже
- [ ] **[Xcode UI]** Создать схему `HV` в Xcode
- [ ] **[Xcode UI]** Добавить WFMNotificationService extension для HVApp (`com.beyondviolet.rost.wfm.WFMNotificationService`)
- [ ] Добавить иконки `AppIconHV.appiconset` (после получения дизайна)
- [ ] Зарегистрировать `com.bv.wfm` в Apple Developer Portal
- [ ] Добавить APNs ключ для com.bv.wfm в Firebase Console

### Firebase и Push

- [ ] Зарегистрировать iOS app `com.bv.wfm` в Firebase Console
- [ ] Зарегистрировать Android app `com.bv.wfm` в Firebase Console
- [ ] Обновить `src/smartGms/google-services.json`
- [ ] Настроить APNs для iOS Умный Сотрудник

### App Store / Play Store

- [ ] Создать приложение «Умный Сотрудник» в App Store Connect
- [ ] Создать приложение «Умный Сотрудник» в Google Play Console
- [ ] Настроить provisioning profiles для `com.bv.wfm`

---

## Инструкция: Применить Smart.xcconfig к WFMApp

1. Открыть `WFMApp.xcodeproj` → Project Navigator → выбрать проект → вкладка **Info**
2. В разделе Configurations для `Debug` и `Release` у target `WFMApp` — выбрать `Smart`
3. Проверить в Build Settings WFMApp: `PRODUCT_BUNDLE_IDENTIFIER = com.bv.wfm`, `INFOPLIST_KEY_CFBundleDisplayName = Умный Сотрудник`
4. Для `WFMNotificationService` extension: изменить bundle ID на `com.bv.wfm.WFMNotificationService`

## Инструкция: Создание iOS target HVApp в Xcode

1. В Project Navigator → нажать на проект WFMApp → вкладка **Targets**
2. Нажать `+` → выбрать **App** template → назвать `HVApp`
3. В Build Settings нового target → Configurations → назначить `HV.xcconfig` для Debug и Release
4. Удалить автосозданные файлы (они дублируют WFMApp) — вместо них добавить все существующие файлы из WFMApp target в HVApp
5. Убедиться, что SPM зависимости (WFMAuth, WFMUI) добавлены в HVApp
6. Создать схему `HV`: Product → Scheme → New Scheme → выбрать HVApp
7. Дополнительно: добавить extension `WFMNotificationService` для HVApp с bundle ID `com.beyondviolet.rost.wfm.WFMNotificationService`

---

## Лог выполнения

### 2026-04-27
- Изучена текущая архитектура iOS (target WFMApp + WFMNotificationService, bundle ID com.beyondviolet.rost.wfm) и Android (flavor dimension "services": gms/hms)
- Создана документация brands.md
- Android: добавлен flavor dimension "brand" (hv/smart) в build.gradle.kts, applicationId = com.bv.wfm для smart
- Android: созданы src/hv/ и src/smart/ с strings.xml
- iOS: созданы Configs/HV.xcconfig и Configs/Smart.xcconfig
- iOS: создан AppIconSmart.appiconset placeholder
