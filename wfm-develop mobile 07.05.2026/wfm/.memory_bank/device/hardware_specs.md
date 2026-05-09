# Hardware Specs — Устройства мониторинга

---

## Целевое устройство: Waveshare ESP32-S3-Touch-AMOLED-2.16

### Процессор
- **MCU**: ESP32-S3R8, Xtensa LX7, двухъядерный, до 240 МГц
- **RAM**: 512 КБ SRAM + 8 МБ PSRAM (встроенная)
- **Flash**: 16 МБ внешняя

### Дисплей
- **Тип**: AMOLED, 2.16", ёмкостный сенсорный
- **Разрешение**: 480 × 480 px, 16.7 млн цветов
- **Драйвер**: CO5300 (интерфейс QSPI)
- **Touch-чип**: CST9220 (интерфейс I2C)

### Беспроводная связь
- **WiFi**: 2.4 ГГц, 802.11 b/g/n, встроенная антенна
- **Bluetooth**: 5.0 (LE)

### Периферия
- 6-осевой IMU: 3-осевой акселерометр + 3-осевой гироскоп
- RTC (часы реального времени)
- Аудиокодек с подавлением эха

### Особенности для прошивки
- Дисплей на QSPI — потребует отдельного драйвера (не TFT_eSPI)
- Touch по I2C — жесты для переключения экранов
- Нет физических кнопок — всё управление через touch

---

## Тестовая платформа: ESP32-S3 + ST7789 1.3"

Используется для разработки прошивки до получения целевого устройства.

### Дисплей
- **Тип**: IPS TFT, 1.3", без touch
- **Разрешение**: 240 × 240 px
- **Драйвер**: ST7789
- **Интерфейс**: SPI

### Пины (из RunSlate проекта)
| Сигнал | GPIO |
|---|---|
| MOSI | 11 |
| SCLK | 12 |
| DC | 4 |
| RST | 5 |
| CS | -1 (не используется) |
| BL | -1 (подтянут к питанию) |

### Toolchain

**PlatformIO + Arduino framework** (platformio.ini):

```ini
[env:esp32s3]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino

monitor_speed = 115200
upload_speed = 921600
upload_protocol = esptool

; PSRAM OPI для ESP32-S3 N16R8
board_build.arduino.memory_type = qio_opi

build_flags =
    -DARDUINO_USB_MODE=1
    -DARDUINO_USB_CDC_ON_BOOT=1
    -DBOARD_HAS_PSRAM
    -DCONFIG_ARDUINO_LOOP_STACK_SIZE=65536
    ; TFT_eSPI — ST7789 240x240
    -DUSER_SETUP_LOADED
    -DST7789_DRIVER
    -DTFT_WIDTH=240
    -DTFT_HEIGHT=240
    -DTFT_MOSI=11
    -DTFT_SCLK=12
    "-DTFT_CS=-1"
    -DTFT_DC=4
    -DTFT_RST=5
    "-DTFT_BL=-1"
    -DUSE_HSPI_PORT
    -DLOAD_GLCD
    -DLOAD_FONT2
    -DLOAD_FONT4
    -DLOAD_GFXFF
    -DSMOOTH_FONT
    -DSPI_FREQUENCY=27000000
    -DSPI_READ_FREQUENCY=20000000
```

### Библиотеки (тестовая платформа)
| Библиотека | Назначение |
|---|---|
| `Bodmer/TFT_eSPI` | Дисплей ST7789 |
| `links2004/WebSockets` | WebSocket клиент |
| встроенная `WiFiMulti` | Множество WiFi-сетей |
| встроенная `WiFi` | Сканирование открытых сетей |

### Особенности для прошивки
- Нет touch — переключение экранов по таймеру (авто-ротация)
- Нет buzzer на борту — можно подключить пьезо на свободный GPIO
- USB CDC: нативный Serial через USB (не UART), `-DARDUINO_USB_CDC_ON_BOOT=1`
