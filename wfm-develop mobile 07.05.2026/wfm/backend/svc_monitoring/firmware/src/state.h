#pragma once
#include <Arduino.h>

// Статусы контейнеров
enum class ContainerStatus { Unknown, Starting, Healthy, Unhealthy, Stopped };

// Один контейнер: имя + статус. Имя хранится как inline-буфер, чтобы не аллоцировать
// String-ы в hot-path парсинга WS-сообщения (вызывается из ISR-контекста WS-callback).
struct ContainerEntry {
    char            name[24] = {0};
    ContainerStatus status   = ContainerStatus::Unknown;
};

struct ServerState {
    float cpu        = -1;
    float mem        = -1;
    float disk       = -1;
    int   errors_1h  = 0;

    // Список контейнеров в том порядке, в котором их прислал сервер.
    // svc_monitoring гарантирует канонический порядок (см. app/domain/schemas.py
    // CRITICAL_CONTAINERS tuple).
    static constexpr int MAX_CONTAINERS = 8;
    ContainerEntry containers[MAX_CONTAINERS];
    int            containers_count = 0;

    uint32_t updated_ts = 0;  // unix timestamp последнего state
    bool     stale      = true;
};

struct AlertMsg {
    String level;    // "critical" / "warning"
    String kind;     // "container_down" / "container_unhealthy" / "api_errors"
    String message;
    uint32_t ts = 0;
};

extern ServerState       g_state;
extern AlertMsg          g_alert;
extern bool              g_has_alert;
extern SemaphoreHandle_t g_state_mutex;

// Состояние коннективности — для отображения в хедере dashboard.
// g_conn_lost_at: millis() в момент потери WS-соединения (0 = соединение есть).
extern bool     g_ws_connected;
extern uint32_t g_conn_lost_at;

inline ContainerStatus status_from_str(const char* s) {
    if (strcmp(s, "healthy")   == 0) return ContainerStatus::Healthy;
    if (strcmp(s, "unhealthy") == 0) return ContainerStatus::Unhealthy;
    if (strcmp(s, "starting")  == 0) return ContainerStatus::Starting;
    if (strcmp(s, "stopped")   == 0) return ContainerStatus::Stopped;
    return ContainerStatus::Unknown;
}
