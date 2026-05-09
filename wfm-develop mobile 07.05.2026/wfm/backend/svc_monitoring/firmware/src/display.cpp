#include "display.h"
#include <WiFi.h>
#include <math.h>

// ── JC4827W543N: QSPI LCD pins ───────────────────────────────────────────────
#define LCD_CS   45
#define LCD_SCK  47
#define LCD_D0   21
#define LCD_D1   48
#define LCD_D2   40
#define LCD_D3   39
// GFX_BL = 1  (defined in build_flags)

// ── Display objects ───────────────────────────────────────────────────────────
Arduino_GFX*    gfx    = nullptr;
Arduino_Canvas* canvas = nullptr;

// ── Palette (RGB565) ──────────────────────────────────────────────────────────
#define CLR_BG    0x0862   // #0A0E14
#define CLR_OK    0x072E   // #00E676
#define CLR_WARN  0xFD80   // #FFB300
#define CLR_CRIT  0xF9E7   // #FF3D3D
#define CLR_UNKN  0x4AAD   // #4A5568
#define CLR_FG    0xFFFF   // #FFFFFF
#define CLR_FG2   0x8CB5   // #8896A8
#define CLR_SURF  0x10C4   // #141920
#define CLR_SURF2 0x1926   // #1C2433

// ── Sprite canvas ─────────────────────────────────────────────────────────────
// Canvas 480×480 (для совместимости с целевым 480×480 AMOLED).
// На JC4827W543N (480×272) рендерим ОДНУ страницу за раз в верхние 272 px холста
// и пушим viewport y=0..272. Каждые 5 сек переключаем содержимое страницы
// (METRICS ↔ CONTAINERS+ERRORS) — никакого vertical pan, никаких overlap-артефактов.
static constexpr int16_t SPR_W = 480, SPR_H = 480;
static constexpr int16_t PHYS_H = 272;              // высота физического дисплея
static constexpr int16_t PAN_BOTTOM = SPR_H - PHYS_H;  // = 208 (для clamp в push_frame_native)
static constexpr uint32_t PAGE_PERIOD_MS = 5000;    // длительность одной страницы

// ── Helpers ───────────────────────────────────────────────────────────────────
static uint16_t dim(uint16_t c, uint8_t a) {
    uint16_t r = ((c >> 11) & 0x1F) * a >> 8;
    uint16_t g = ((c >>  5) & 0x3F) * a >> 8;
    uint16_t b = ( c        & 0x1F) * a >> 8;
    return (r << 11) | (g << 5) | b;
}

static uint16_t metric_color(float v) {
    if (v < 0)   return CLR_UNKN;
    if (v < 70)  return CLR_OK;
    if (v < 90)  return CLR_WARN;
    return CLR_CRIT;
}

static uint16_t cstatus_color(ContainerStatus s) {
    switch (s) {
        case ContainerStatus::Healthy:   return CLR_OK;
        case ContainerStatus::Starting:  return CLR_WARN;
        case ContainerStatus::Unhealthy: return CLR_CRIT;
        case ContainerStatus::Stopped:   return CLR_UNKN;
        default:                         return CLR_UNKN;
    }
}

static const char* cstatus_label(ContainerStatus s) {
    switch (s) {
        case ContainerStatus::Healthy:   return "HEALTHY";
        case ContainerStatus::Starting:  return "STARTING";
        case ContainerStatus::Unhealthy: return "UNHEALTHY";
        case ContainerStatus::Stopped:   return "STOPPED";
        default:                         return "UNKNOWN";
    }
}

// ── Text helpers ──────────────────────────────────────────────────────────────
static void draw_text_mc(const char* s, int cx, int cy, uint16_t col) {
    canvas->setTextColor(col);
    int16_t x1, y1; uint16_t w, h;
    canvas->getTextBounds(s, 0, 0, &x1, &y1, &w, &h);
    canvas->setCursor(cx - (int16_t)w/2 - x1, cy - (int16_t)h/2 - y1);
    canvas->print(s);
}

static void draw_text_ml(const char* s, int x, int cy, uint16_t col) {
    canvas->setTextColor(col);
    int16_t x1, y1; uint16_t w, h;
    canvas->getTextBounds(s, 0, 0, &x1, &y1, &w, &h);
    canvas->setCursor(x - x1, cy - (int16_t)h/2 - y1);
    canvas->print(s);
}

static void draw_text_mr(const char* s, int rx, int cy, uint16_t col) {
    canvas->setTextColor(col);
    int16_t x1, y1; uint16_t w, h;
    canvas->getTextBounds(s, 0, 0, &x1, &y1, &w, &h);
    canvas->setCursor(rx - (int16_t)w - x1, cy - (int16_t)h/2 - y1);
    canvas->print(s);
}

static void draw_text_tl(const char* s, int x, int y, uint16_t col) {
    canvas->setTextColor(col);
    int16_t x1, y1; uint16_t w, h;
    canvas->getTextBounds(s, 0, 0, &x1, &y1, &w, &h);
    canvas->setCursor(x - x1, y - y1);
    canvas->print(s);
}

// Возвращает ширину строки в текущем размере (учётом отступов bounds).
static int text_w(const char* s) {
    int16_t x1, y1; uint16_t w, h;
    canvas->getTextBounds(s, 0, 0, &x1, &y1, &w, &h);
    return (int)w;
}

// ── Init ──────────────────────────────────────────────────────────────────────
void display_init() {
    Arduino_DataBus* bus = new Arduino_ESP32QSPI(LCD_CS, LCD_SCK, LCD_D0, LCD_D1, LCD_D2, LCD_D3);
    gfx    = new Arduino_NV3041A(bus);
    canvas = new Arduino_Canvas(SPR_W, SPR_H, gfx, 0, 0);
    bool ok = canvas->begin();

    // IPS panel inversion
    gfx->invertDisplay(true);

    // Backlight
    pinMode(GFX_BL, OUTPUT);
    digitalWrite(GFX_BL, HIGH);

    // Закрашиваем физ. экран (на случай если viewport не покроет какой-то пиксель — не должно, но safe)
    gfx->fillScreen(CLR_BG);

    Serial.printf("[DISPLAY] JC4827W543N init. Canvas %dx%d %s (%u KB PSRAM)\n",
                  SPR_W, SPR_H,
                  ok ? "OK" : "FAILED",
                  (uint32_t)SPR_W * SPR_H * 2 / 1024);
}

// ── Pixel-perfect 1:1 push: viewport [y_offset .. y_offset+272) → физ. экран ──
static void push_frame_native(int16_t y_offset) {
    if (y_offset < 0)         y_offset = 0;
    if (y_offset > PAN_BOTTOM) y_offset = PAN_BOTTOM;

    uint16_t* fb = canvas->getFramebuffer();
    if (!fb) { canvas->flush(); return; }

    // Вся прямоугольная область одной операцией (без построчного цикла —
    // Arduino_GFX оптимизирует подряд идущие пиксели в QSPI burst).
    gfx->draw16bitRGBBitmap(0, 0, fb + (uint32_t)y_offset * SPR_W, SPR_W, PHYS_H);
}

// ── Thick line (для крестика на wifi-icon) ────────────────────────────────────
static void draw_thick_line(int x0, int y0, int x1, int y1, int hw, uint16_t col) {
    float dx = (float)(x1 - x0), dy = (float)(y1 - y0);
    float len = sqrtf(dx*dx + dy*dy);
    if (len < 1.0f) return;
    float nx = -dy / len, ny = dx / len;
    for (int d = -hw; d <= hw; d++) {
        int ox = (int)(nx * d + 0.5f), oy = (int)(ny * d + 0.5f);
        canvas->drawLine(x0+ox, y0+oy, x1+ox, y1+oy, col);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD PRIMITIVES
// ══════════════════════════════════════════════════════════════════════════════

// MiniBar — горизонтальная прогресс-полоска с лейблом слева и значением справа.
// Layout: [LABEL 60px] [BAR 280px] [VALUE 60px] @ canvas-coords.
//   x — левый край ряда; y — центральная линия; w — общая ширина.
//   bar_h фиксирован: 16 px (визуально совпадает с дизайном, scale-up из jsx 8 px).
static void draw_mini_bar(int x, int cy, int w, float value, uint16_t color, const char* label) {
    const int label_w = 70;
    const int value_w = 80;
    const int gap     = 12;
    const int bar_x   = x + label_w + gap;
    const int bar_w   = w - label_w - value_w - gap * 2;
    const int bar_h   = 16;
    const int bar_y   = cy - bar_h / 2;

    // Лейбл
    canvas->setTextSize(2);
    draw_text_ml(label, x, cy, CLR_FG2);

    // Track
    canvas->fillRoundRect(bar_x, bar_y, bar_w, bar_h, 4, CLR_SURF2);

    // Fill (с минимальным индикатором при value == 0, чтобы 0% не путалось с «нет данных»)
    if (value >= 0) {
        float pct = value > 100.0f ? 1.0f : value / 100.0f;
        int   fill_w = (int)(bar_w * pct);
        if (fill_w < bar_h) fill_w = bar_h;  // минимум — квадрат-«заглушка» в начале
        canvas->fillRoundRect(bar_x, bar_y, fill_w, bar_h, 4, color);
    }

    // Value справа
    char buf[8];
    if (value < 0) snprintf(buf, sizeof(buf), "--");
    else           snprintf(buf, sizeof(buf), "%d%%", (int)value);
    draw_text_mr(buf, x + w, cy, value < 0 ? CLR_UNKN : CLR_FG);
}

// Status badge: rounded rect с полупрозрачным фоном + цветным текстом внутри.
// Используется в карточках контейнеров — даёт визуальную «коробочку» вокруг статуса
// вместо болтающегося цветного текста на тёмном фоне.
static void draw_status_badge(int rx, int cy, const char* label, uint16_t color) {
    canvas->setTextSize(1);
    int tw = text_w(label);
    const int pad_x = 8, pad_y = 4;
    int bw = tw + pad_x * 2;
    int bh = 8 + pad_y * 2;
    int bx = rx - bw;
    int by = cy - bh / 2;
    canvas->fillRoundRect(bx, by, bw, bh, 4, dim(color, 40));
    canvas->drawRoundRect(bx, by, bw, bh, 4, dim(color, 100));
    draw_text_mc(label, bx + bw / 2, cy, color);
}

// MiniServiceRow — компактная строка контейнера БЕЗ заливки карточки:
//   [accent strip | dot+halo | name | status badge]
// Высота 26 px. Все 4 строки в bottom-viewport помещаются с gap 4 px.
static void draw_mini_service_row(int x, int y, int w, const char* name, ContainerStatus status) {
    const int h  = 26;
    int       cy = y + h / 2;
    uint16_t  c  = cstatus_color(status);

    // Accent strip (rounded для визуальной чистоты)
    canvas->fillRoundRect(x, y + 2, 4, h - 4, 2, c);

    // Status dot с halo
    int dot_cx = x + 20;
    canvas->fillCircle(dot_cx, cy, 7, dim(c, 70));
    canvas->fillCircle(dot_cx, cy, 4, c);

    // Name (без svc_-префикса)
    const char* short_name = name;
    if (strncmp(name, "svc_", 4) == 0) short_name = name + 4;
    canvas->setTextSize(2);
    draw_text_ml(short_name, dot_cx + 14, cy, CLR_FG);

    // Status badge справа (с небольшим инсетом от правого края)
    draw_status_badge(x + w - 4, cy, cstatus_label(status), c);
}

// Wifi-иконка для хедера. ~30×16, центр в (cx, cy).
//   Три концентрических сектора одинаковой толщины 3 px с одинаковыми
//   зазорами 3 px. Без точки-источника — самый внутренний сектор сам играет
//   её роль. Веер 220..320 (100°) — узкий, как у классической wifi-иконки.
//
//   Геометрия (расстояния между центрами полосок ровные = 6 px):
//     outer  ring  r=12..15  (3)
//     gap          r= 9..12  (3)
//     middle ring  r= 6.. 9  (3)
//     gap          r= 3.. 6  (3)
//     inner  wedge r= 0.. 3  (3)   ← самый нижний сектор
static void draw_wifi_small(int cx, int cy, bool ok) {
    uint16_t c = ok ? CLR_OK : CLR_UNKN;
    const int ay = cy + 7;  // anchor чуть ниже центра, чтобы икона визуально центрировалась
    const float A1 = 220.0f, A2 = 320.0f;

    // Сплошной wedge → вырезаем два зазора BG-цветом
    canvas->fillArc(cx, ay, 15, 0,  A1, A2, c);
    canvas->fillArc(cx, ay, 12, 9,  A1, A2, CLR_BG);
    canvas->fillArc(cx, ay,  6, 3,  A1, A2, CLR_BG);

    if (!ok) {
        // Диагональный слэш `\` через всю иконку
        int x0 = cx - 15, y0 = cy - 10;
        int x1 = cx + 15, y1 = cy + 8;
        draw_thick_line(x0, y0, x1, y1, 2, CLR_BG);
        draw_thick_line(x0, y0, x1, y1, 1, CLR_CRIT);
    }
}

// Errors-pill: компактная пилюля с числом (для нижней секции dashboard).
// Размер вычисляется из реальных bounds текста (не угадываем 24px).
static void draw_errors_pill(int rx, int cy, int errors) {
    uint16_t col = (errors == 0) ? CLR_OK : (errors < 5 ? CLR_WARN : CLR_CRIT);
    char buf[8];
    snprintf(buf, sizeof(buf), "%d", errors);

    canvas->setTextSize(3);
    int16_t x1, y1; uint16_t tw, th;
    canvas->getTextBounds(buf, 0, 0, &x1, &y1, &tw, &th);

    const int pad_x = 14, pad_y = 8;
    int pill_w = tw + pad_x * 2;
    int pill_h = th + pad_y * 2;
    int pill_x = rx - pill_w;
    int pill_y = cy - pill_h / 2;

    canvas->fillRoundRect(pill_x, pill_y, pill_w, pill_h, 8, dim(col, 50));
    canvas->drawRoundRect(pill_x, pill_y, pill_w, pill_h, 8, dim(col, 120));
    draw_text_mc(buf, pill_x + pill_w / 2, cy, col);
}

// ── Header (рендерится дважды — на y=0 и y=208 в canvas) ─────────────────────
//   [WFM]                     [NO WIFI 1m12s] [📶] [● LIVE]
//
// Размещение справа налево от правого края (x=448).
static void format_duration(uint32_t ms, char* out, size_t out_sz) {
    uint32_t s = ms / 1000;
    uint32_t m = s / 60;
    s %= 60;
    snprintf(out, out_sz, "%lum %02lus", (unsigned long)m, (unsigned long)s);
}

static void draw_dashboard_header(int y_top) {
    // Хедер занимает примерно 0..56 от y_top.
    const int row_cy = y_top + 28;
    const int rx     = 448;  // правый край контента

    // ── Логотип WFM (слева, крупно) ──
    canvas->setTextSize(3);
    draw_text_ml("WFM", 32, row_cy, CLR_FG);

    // ── Правая часть: live dot + label ──
    canvas->setTextSize(2);
    bool alive = g_ws_connected;
    uint16_t dc = alive ? CLR_OK : CLR_UNKN;
    const char* dot_label = alive ? "LIVE" : "STALE";

    int dot_label_w = text_w(dot_label);
    int dot_label_x = rx - dot_label_w;          // text_mr style
    int dot_cx      = dot_label_x - 14;          // dot слева от текста с зазором
    int dot_cy      = row_cy;

    canvas->fillCircle(dot_cx, dot_cy, 8, dim(dc, 100));
    canvas->fillCircle(dot_cx, dot_cy, 5, dc);
    draw_text_mr(dot_label, rx, row_cy, CLR_FG2);

    // ── Wifi icon (слева от dot, с зазором 8 px) ──
    // Иконка half-width 15, dot halo radius 8, целевой gap 8 px.
    int wifi_cx = dot_cx - 8 - 8 - 15;
    bool wifi_ok = (WiFi.status() == WL_CONNECTED);
    draw_wifi_small(wifi_cx, dot_cy, wifi_ok);

    // ── NO WIFI / NO SERVER badge (если связь есть — пусто) ──
    if (!alive) {
        const char* badge_label = wifi_ok ? "NO SERVER" : "NO WIFI";

        char dur[16] = "";
        if (g_conn_lost_at != 0) {
            format_duration(millis() - g_conn_lost_at, dur, sizeof(dur));
        }

        // [LABEL DUR] — компактным шрифтом, левее wifi-icon (gap 10 px)
        canvas->setTextSize(1);
        int label_w = text_w(badge_label);
        int dur_w   = text_w(dur);
        int total_w = label_w + 8 + dur_w;
        int badge_x = (wifi_cx - 18 - 10) - total_w;

        draw_text_ml(badge_label, badge_x, dot_cy, CLR_UNKN);
        if (dur[0]) draw_text_ml(dur, badge_x + label_w + 8, dot_cy, CLR_CRIT);
    }
}

// ── Section divider (horizontal line) ────────────────────────────────────────
static void draw_divider(int x, int y, int w) {
    canvas->drawFastHLine(x, y, w, CLR_SURF2);
}

// ── Section label (мелкая подпись «METRICS» / «CONTAINERS») ──────────────────
static void draw_section_label(const char* s, int x, int y) {
    canvas->setTextSize(1);
    draw_text_tl(s, x, y, CLR_UNKN);
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCREEN — DASHBOARD (page-switch model)
// ══════════════════════════════════════════════════════════════════════════════
//
// Хедер всегда на y=0..56. Под ним каждые PAGE_PERIOD_MS меняется content:
//   page 0 (METRICS):           CPU / MEM / DISK mini-bars
//   page 1 (CONTAINERS+ERRORS): список контейнеров + строка errors/1h
//
// Push всегда с y=0 — overlap-артефактов нет, дублировать хедер не нужно.
//
// Раскладка page 0 (canvas y=0..272):
//   y=0..56   HEADER
//   y=70      divider
//   y=84      "METRICS" label
//   y=120     CPU bar
//   y=160     MEM bar
//   y=200     DISK bar
//
// Раскладка page 1 (canvas y=0..272):
//   y=0..56   HEADER
//   y=70      divider
//   y=84      "CONTAINERS" label
//   y=100..216  4 service rows (26 height + 4 gap)
//   y=226     divider
//   y=244     ERRORS row (label + pill, full width)
//
void screen_dashboard() {
    // Snapshot состояния под мьютексом
    xSemaphoreTake(g_state_mutex, portMAX_DELAY);
    float cpu  = g_state.cpu;
    float mem  = g_state.mem;
    float disk = g_state.disk;
    int   errs = g_state.errors_1h;
    int   nc   = g_state.containers_count;
    ContainerEntry containers[ServerState::MAX_CONTAINERS];
    for (int i = 0; i < nc; i++) containers[i] = g_state.containers[i];
    xSemaphoreGive(g_state_mutex);

    bool show_metrics = ((millis() / PAGE_PERIOD_MS) % 2) == 0;

    canvas->fillScreen(CLR_BG);

    // ── HEADER (общий для обеих страниц) ──
    draw_dashboard_header(0);
    draw_divider(32, 70, 416);

    if (show_metrics) {
        // ── METRICS ──
        draw_section_label("METRICS", 32, 84);
        draw_mini_bar(32, 120, 416, cpu,  metric_color(cpu),  "CPU");
        draw_mini_bar(32, 160, 416, mem,  metric_color(mem),  "MEM");
        draw_mini_bar(32, 200, 416, disk, metric_color(disk), "DISK");
    } else {
        // ── CONTAINERS ──
        draw_section_label("CONTAINERS", 32, 84);

        int row_y = 100;
        for (int i = 0; i < nc && i < 4; i++) {
            draw_mini_service_row(32, row_y, 416, containers[i].name, containers[i].status);
            row_y += 30;
        }

        // ── ERRORS / 1H — без divider'а, разделяет визуально whitespace + сама пилюля ──
        int err_cy = 250;
        canvas->setTextSize(1);
        draw_text_ml("ERRORS / 1H", 32, err_cy, CLR_UNKN);
        draw_errors_pill(448, err_cy, errs);
    }

    push_frame_native(0);
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCREEN — ALERT (over dashboard)
// ══════════════════════════════════════════════════════════════════════════════
// Адаптировано под viewport 480×272: контент в y=0..272.
static void draw_alert_icon(int cx, int cy, int sz, uint16_t col) {
    int ax = cx,             ay = cy - sz/2;
    int bl = cx - sz*48/80,  br = cx + sz*48/80;
    int by = cy + sz/2;
    canvas->fillTriangle(ax, ay, bl, by, br, by, dim(col, 46));
    canvas->drawLine(ax, ay, bl, by, col);
    canvas->drawLine(bl, by, br, by, col);
    canvas->drawLine(br, by, ax, ay, col);
    canvas->fillRect(cx - 3, ay + sz/5, 6, sz * 25/80, col);
    canvas->fillCircle(cx, by - sz/8, 5, col);
}

void screen_alert(const AlertMsg& alert) {
    bool     is_crit = (alert.level == "critical");
    uint16_t col     = is_crit ? CLR_CRIT : CLR_WARN;

    canvas->fillScreen(CLR_BG);

    // Top accent bar
    canvas->fillRect(0, 0, SPR_W, 6, col);

    // Level badge (y center 28)
    canvas->setTextSize(2);
    int bw = 200, bh = 36;
    canvas->fillRoundRect((SPR_W - bw) / 2, 12, bw, bh, 6, dim(col, 30));
    canvas->drawRoundRect((SPR_W - bw) / 2, 12, bw, bh, 6, dim(col, 80));
    draw_text_mc(is_crit ? "CRITICAL" : "WARNING", SPR_W / 2, 30, col);

    // Triangle icon — center 130
    draw_alert_icon(SPR_W / 2, 130, 80, col);

    // Message
    canvas->setTextSize(2);
    draw_text_mc(alert.message.c_str(), SPR_W / 2, 220, CLR_FG);

    // Bottom accent bar (в пределах viewport 272)
    canvas->fillRect(0, PHYS_H - 6, SPR_W, 6, dim(col, 100));

    // Alert всегда из верхней половины canvas
    push_frame_native(0);
}
