#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

#include "state.h"
#include "display.h"
#include "secrets.h"

// ── Глобальное состояние ─────────────────────────────────────────────────────
ServerState       g_state;
AlertMsg          g_alert;
bool              g_has_alert    = false;
SemaphoreHandle_t g_state_mutex  = nullptr;

// Коннективность — для отображения в хедере dashboard.
bool     g_ws_connected = false;
uint32_t g_conn_lost_at = 0;

// ── Внутреннее состояние задач ────────────────────────────────────────────────
static WiFiMulti        s_wifi_multi;
static WebSocketsClient s_ws;

static uint32_t s_alert_shown_at = 0;       // millis() когда показали alert

static const char* WIFI_CREDS[][2] = { WIFI_NETWORKS, {nullptr, nullptr} };
static const uint32_t ALERT_SHOW_MS    = 10000;
static const uint32_t ALARM_TIMEOUT_MS = 30UL * 60 * 1000;  // 30 мин

// ── Разбор JSON → g_state / g_alert ─────────────────────────────────────────
static void parse_message(const char* payload) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (err) return;

    const char* type = doc["type"];
    if (!type) return;

    if (strcmp(type, "state") == 0) {
        xSemaphoreTake(g_state_mutex, portMAX_DELAY);
        g_state.cpu        = doc["cpu"]  | -1.0f;
        g_state.mem        = doc["mem"]  | -1.0f;
        g_state.disk       = doc["disk"] | -1.0f;
        g_state.errors_1h  = doc["errors_1h"] | 0;
        g_state.updated_ts = doc["ts"] | 0u;
        g_state.stale      = false;

        // Контейнеры — итерация в порядке прихода (ArduinoJson сохраняет insertion-order)
        g_state.containers_count = 0;
        JsonObject c = doc["containers"];
        if (!c.isNull()) {
            for (JsonPair kv : c) {
                if (g_state.containers_count >= ServerState::MAX_CONTAINERS) break;
                ContainerEntry& e = g_state.containers[g_state.containers_count++];
                strncpy(e.name, kv.key().c_str(), sizeof(e.name) - 1);
                e.name[sizeof(e.name) - 1] = 0;
                e.status = status_from_str(kv.value().as<const char*>());
            }
        }
        xSemaphoreGive(g_state_mutex);
        return;
    }

    if (strcmp(type, "alert") == 0) {
        xSemaphoreTake(g_state_mutex, portMAX_DELAY);
        g_alert.level    = doc["level"]   | "warning";
        g_alert.kind     = doc["kind"]    | "";
        g_alert.message  = doc["message"] | "";
        g_alert.ts       = doc["ts"] | 0u;
        g_has_alert      = true;
        s_alert_shown_at = millis();
        xSemaphoreGive(g_state_mutex);
    }
}

// ── WebSocket события ─────────────────────────────────────────────────────────
static void on_ws_event(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED:
            g_ws_connected = true;
            g_conn_lost_at = 0;
            Serial.println("[WS] connected");
            break;
        case WStype_DISCONNECTED:
            if (g_ws_connected && g_conn_lost_at == 0) {
                g_conn_lost_at = millis();
            }
            g_ws_connected = false;
            Serial.println("[WS] disconnected");
            break;
        case WStype_TEXT:
            parse_message((const char*)payload);
            break;
        default:
            break;
    }
}

// ── Сканирование открытых WiFi (pocket mode) ──────────────────────────────────
static void scan_and_try_open_wifi() {
    Serial.println("[WiFi] scanning open networks...");
    int n = WiFi.scanNetworks(false, false);
    for (int i = 0; i < n; i++) {
        if (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) {
            Serial.printf("[WiFi] trying open: %s\n", WiFi.SSID(i).c_str());
            WiFi.begin(WiFi.SSID(i).c_str());
            for (int t = 0; t < 20 && WiFi.status() != WL_CONNECTED; t++) {
                delay(500);
            }
            if (WiFi.status() == WL_CONNECTED) {
                Serial.printf("[WiFi] connected to open: %s\n", WiFi.SSID(i).c_str());
                return;
            }
        }
    }
}

// ── Задача: WiFi + WebSocket ──────────────────────────────────────────────────
static void connectivity_task(void*) {
    for (int i = 0; WIFI_CREDS[i][0] != nullptr; i++) {
        s_wifi_multi.addAP(WIFI_CREDS[i][0], WIFI_CREDS[i][1]);
    }

    uint32_t last_scan_ms   = 0;
    uint32_t last_reconnect = 0;

    while (true) {
        if (WiFi.status() != WL_CONNECTED) {
            // Записываем момент потери коннективности (чтобы в хедере таймер тикал
            // даже при потере wifi, не только WS)
            if (g_conn_lost_at == 0) g_conn_lost_at = millis();

            s_wifi_multi.run(5000);
            if (millis() - last_scan_ms > 5UL * 60 * 1000) {
                last_scan_ms = millis();
                scan_and_try_open_wifi();
            }
        }

        if (WiFi.status() == WL_CONNECTED) {
            if (!g_ws_connected && millis() - last_reconnect > 10000) {
                last_reconnect = millis();
                s_ws.beginSSL(WS_HOST, WS_PORT,
                              String(WS_PATH) + "?token=" + WS_TOKEN);
                s_ws.onEvent(on_ws_event);
                s_ws.setReconnectInterval(5000);
            }
            s_ws.loop();
        }

        delay(10);
    }
}

// ── Задача: тревога при долгой потере WS ─────────────────────────────────────
static void alarm_task(void*) {
    while (true) {
        if (!g_ws_connected && g_conn_lost_at > 0) {
            if (millis() - g_conn_lost_at > ALARM_TIMEOUT_MS) {
#if BUZZER_PIN >= 0
                tone(BUZZER_PIN, 2000, 500);
#endif
                Serial.println("[ALARM] no server for 30 min!");
                delay(60000);
                continue;
            }
        }
        delay(5000);
    }
}

// ── Setup / Loop ──────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    psramInit();

    g_state_mutex = xSemaphoreCreateMutex();

    display_init();

    // Стартовый рендер: dashboard покажет `--` для метрик и пустой список контейнеров
    // плюс NO WIFI badge в хедере — это понятное стартовое состояние.
    screen_dashboard();

    xTaskCreatePinnedToCore(connectivity_task, "wifi_ws", 16384, nullptr, 2, nullptr, 0);
    xTaskCreatePinnedToCore(alarm_task,        "alarm",    4096,  nullptr, 1, nullptr, 0);
}

void loop() {
    uint32_t now = millis();

    // Alert overlay — приоритет над dashboard
    xSemaphoreTake(g_state_mutex, portMAX_DELAY);
    bool     has_alert = g_has_alert;
    AlertMsg alert     = g_alert;
    xSemaphoreGive(g_state_mutex);

    if (has_alert) {
        screen_alert(alert);
        if (now - s_alert_shown_at > ALERT_SHOW_MS) {
            xSemaphoreTake(g_state_mutex, portMAX_DELAY);
            g_has_alert = false;
            xSemaphoreGive(g_state_mutex);
        }
        delay(200);
        return;
    }

    // Единый dashboard — статус коннекта (LIVE/STALE, NO WIFI/NO SERVER) живёт в хедере
    screen_dashboard();
    delay(200);
}
