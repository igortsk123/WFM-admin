# План: Экран деталей задачи (Task Detail Screen)

**Статус:** Выполнено
**Создан:** 2026-02-26
**Завершён:** 2026-02-27
**Последнее обновление:** 2026-02-27 (все задачи выполнены)

## Цель

Переделать экран деталей задачи (iOS и Android) в соответствии с дизайном из Figma. Экран должен поддерживать все состояния задачи (NEW, IN_PROGRESS, PAUSED, COMPLETED) с правильной версткой, токенами цветов и отступов из дизайн-системы.

## Дизайн-ссылки

- NEW: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3507-9678
- IN_PROGRESS: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3507-9769
- PAUSED: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3507-9874
- Bottom Sheet (завершение): https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3507-10046
- COMPLETED: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3526-63782

## Структура экрана

### Общие элементы (все состояния)

1. **Header**
   - Кнопка назад (arrow-left)
   - Заголовок задачи (Headline20Bold, neutral900)
   - Фон: surface/secondary (white)

2. **Task Info Section** (white background)
   - Зона: лейбл (text/tertiary) + значение (text/primary), Medium 14px
   - Категория: лейбл + значение, Medium 14px
   - Период:
     - Иконка часов (12×12px)
     - Текст (text/secondary, Medium 14px):
       - NEW: "60 минут"
       - IN_PROGRESS: "Осталось XX минут"
       - PAUSED: "Осталось XX минут"
   - WFMProgressBar:
     - NEW: пустой (progress=0)
     - IN_PROGRESS: частично заполнен (progress=0.0-1.0), state=normal
     - PAUSED: частично заполнен, state=paused (с диагональными линиями)
     - COMPLETED: не показывается, вместо периода текст "Задача завершена"

3. **Content Area** (surface/primary background #f5f5fc)
   - Info card (card/surface/info #eeeef8):
     - Иконка info (24×24px)
     - Текст описания (Body14Regular, card/text/primary)
     - Padding: 12px horizontal, 16px vertical
     - Border radius: xl (16px)
     - Gap между иконкой и текстом: 8px

4. **Actions Section** (white background)
   - Кнопки в зависимости от состояния (см. ниже)
   - Padding: 16px
   - Gap между кнопками: 8px

5. **Home Indicator** (iOS native)

### Состояния и кнопки

#### NEW
- **Кнопки**:
  - "Начать" (WFMPrimaryButton, fullWidth, height=44dp/48dp)

#### IN_PROGRESS
- **Кнопки** (горизонтально, 2 кнопки):
  - "Приостановить" (WFMSecondaryButton, flex=1, с иконкой pause)
  - "Завершить" (WFMPrimaryButton, flex=1)

#### PAUSED
- **Toast**: "Вы приостановили задачу" (показывается при переходе в PAUSED)
- **Кнопки** (горизонтально, 2 кнопки):
  - "Продолжить" (WFMSecondaryButton, flex=1, с иконкой play)
  - "Завершить" (WFMPrimaryButton, flex=1)

#### COMPLETED
- **Кнопки**: нет
- **Текст**: "Задача завершена" вместо периода

### Bottom Sheet (подтверждение завершения)

- Overlay: surface/overlay-modal (rgba(0,0,0,0.7))
- Bottom Sheet (WFMBottomSheet):
  - Заголовок: "Завершить задачу?" (Headline20Bold, text/primary, center)
  - Padding: 16px
  - Кнопки (горизонтально):
    - "Отменить" (WFMSecondaryButton, flex=1, size=big)
    - "Завершить" (WFMPrimaryButton, flex=1, size=big)

## Цвета и токены (обязательно использовать)

### Цвета
- `surface/primary`: #f5f5fc (фон экрана)
- `surface/secondary`: white (фон header и actions)
- `neutral/900`: #373742 (заголовок)
- `text/tertiary`: #808095 (лейблы)
- `text/primary`: #373742 (значения)
- `text/secondary`: #5e5e6d (период)
- `card/surface/info`: #eeeef8 (фон info card)
- `card/text/primary`: #373742 (текст в info card)
- `progress-indicator/bg-empty`: #eeeef8 (фон прогресс-бара)
- `progress-indicator/bg-filled`: #6738dd (заполненная часть)
- `progress-indicator/bg-paused`: #9898AE (паттерн паузы)
- `button/primary/bg-default`: #6738dd
- `button/primary/text-default`: white
- `button/secondary/bg-default`: #efe8ff
- `button/secondary/text-default`: #6738dd
- `button/secondary/border`: #efe8ff

### Типографика
- Headline20Bold: size=20px, weight=700, lineHeight=28px (заголовок)
- Headline14Medium: size=14px, weight=500, lineHeight=20px (лейблы и значения)
- Body14Regular: size=14px, weight=400, lineHeight=20px (описание)
- Headline14Bold: size=14px, weight=700, lineHeight=20px, letterSpacing=-1.5% (кнопки medium)
- Headline16Bold: size=16px, weight=700, lineHeight=24px, letterSpacing=-2% (кнопки big)

### Отступы
- Horizontal screen padding: 16px (xl)
- Task Info gap: 16px
- Info card padding: 12px horizontal, 16px vertical
- Actions padding: 16px
- Gap между кнопками: 8px
- Gap между элементами внутри Task Info: 4px

## Задачи

### iOS

- [x] Обновить TaskDetailViewModel — 2026-02-27
  - [x] Добавить @Published var showCompleteConfirmation: Bool для bottom sheet
  - [x] Добавить computed property var progress: Double (вычислить на основе startedAt и plannedMinutes)
  - [x] Добавить computed property var remainingMinutes: Int
  - [x] Обновить pauseTask() — показать toast "Вы приостановили задачу"
  - [x] Добавить методы requestCompleteConfirmation() и cancelComplete()

- [x] Переписать TaskDetailView — 2026-02-27
  - [x] Удалить старую верстку (stateCard, detailsSection, actionsSection)
  - [x] Создать новую структуру:
    - [x] Header с кнопкой назад и заголовком (использовать .navigationTitle)
    - [x] Task Info Section:
      - [x] Зона (лейбл + значение)
      - [x] Категория (лейбл + значение)
      - [x] Период (иконка + текст) или "Задача завершена"
      - [x] WFMProgressBar с правильным state (normal/paused)
    - [x] Content Area с info card
    - [x] Actions Section с кнопками в зависимости от состояния
  - [x] Использовать WFMColors токены вместо hardcoded цветов
  - [x] Использовать WFMSpacing токены для отступов
  - [x] Использовать WFMTypography для шрифтов
  - [x] Добавить WFMBottomSheet для подтверждения завершения
  - [x] Сохранить Pull-to-Refresh для обновления данных задачи

### Android

- [x] Обновить TaskDetailsViewModel — 2026-02-27
  - [x] Добавить StateFlow<Boolean> showCompleteConfirmation для bottom sheet
  - [x] Добавить функции calculateProgress() и calculateRemainingMinutes()
  - [x] Обновить pauseTask() — показать toast "Вы приостановили задачу"
  - [x] Добавить методы requestCompleteConfirmation() и cancelComplete()

- [x] Переписать TaskDetailsScreen — 2026-02-27
  - [x] Удалить старую верстку (cards)
  - [x] Создать новую структуру:
    - [x] Header с кнопкой назад и заголовком
    - [x] Task Info Section:
      - [x] Зона (лейбл + значение)
      - [x] Категория (лейбл + значение)
      - [x] Период (иконка + текст) или "Задача завершена"
      - [x] WfmProgressBar с правильным state (normal/paused)
    - [x] Content Area с info card
    - [x] Actions Section с кнопками в зависимости от состояния
  - [x] Использовать WfmColors токены вместо MaterialTheme colors
  - [x] Использовать WfmSpacing токены для отступов
  - [x] Использовать WfmTypography для шрифтов
  - [x] Добавить WfmBottomSheet для подтверждения завершения
  - [x] Сохранить PullToRefreshBox для обновления данных задачи

### Дополнительно (если нужно)

- [x] Иконки найдены в Assets — 2026-02-27:
  - [x] clock → ic-time (iOS), ic_time.xml (Android)
  - [x] info → futered-info (iOS), ic_featured_info.xml (Android)
  - ℹ️ arrow-left использует стандартную навигацию (не требуется отдельная иконка)
  - ℹ️ pause/play используются только в тексте кнопок (не требуются отдельные иконки)

## Критерии приёмки

1. ✅ Экран соответствует дизайну из Figma для всех состояний (NEW, IN_PROGRESS, PAUSED, COMPLETED)
2. ✅ Используются только токены из WFMColors/WfmColors (нет hardcoded цветов)
3. ✅ Используются токены WFMSpacing/WfmSpacing для отступов
4. ✅ Используются токены WFMTypography/WfmTypography для шрифтов
5. ✅ WFMProgressBar правильно отображает состояние normal/paused
6. ✅ Bottom Sheet показывается при нажатии "Завершить"
7. ✅ Toast "Вы приостановили задачу" показывается при паузе
8. ✅ Кнопки используют WFMPrimaryButton/WFMSecondaryButton компоненты
9. ✅ Верстка адаптивна и корректно отображается на разных размерах экранов
10. ✅ Pull-to-Refresh работает для обновления состояния задачи с сервера

## Лог выполнения

### 2026-02-27
- ✅ **iOS: TaskDetailViewModel обновлен**
  - Добавлен showCompleteConfirmation для управления bottom sheet
  - Добавлены computed properties progress и remainingMinutes
  - pauseTask() теперь показывает toast "Вы приостановили задачу"
  - Добавлены методы requestCompleteConfirmation() и cancelComplete()
- ✅ **iOS: TaskDetailView полностью переписан**
  - Новая структура: Task Info Section → Content Area → Actions Section (fixed at bottom)
  - Используются все токены дизайн-системы (WFMColors, WFMSpacing, WFMTypography)
  - Добавлен WFMProgressBar с состояниями normal/paused
  - Добавлен WFMBottomSheet для подтверждения завершения
  - Используются WFMPrimaryButton/WFMSecondaryButton
  - Pull-to-refresh сохранён
  - Иконки заменены на Assets (ic-time, futered-info)
- ✅ **Android: TaskDetailsViewModel обновлен**
  - Добавлен showCompleteConfirmation StateFlow
  - Добавлены функции calculateProgress() и calculateRemainingMinutes()
  - pauseTask() показывает toast "Вы приостановили задачу"
  - Добавлены методы requestCompleteConfirmation() и cancelComplete()
- ✅ **Android: TaskDetailsScreen полностью переписан**
  - Новая структура аналогична iOS
  - Используются все токены дизайн-системы (WfmColors, WfmSpacing, WfmTypography)
  - Добавлен WfmProgressBar с состояниями normal/paused
  - Добавлен WfmBottomSheet для подтверждения завершения
  - Используются WfmPrimaryButton/WfmSecondaryButton
  - PullToRefreshBox сохранён
  - Иконки из drawable (ic_time.xml, ic_featured_info.xml)

### 2026-02-26
- Создан план реализации
- Получены дизайны из Figma для всех состояний
- Изучена текущая реализация iOS и Android
- Определена структура экрана и список компонентов
