#pragma once
#include <Arduino_GFX_Library.h>
#include "state.h"

// Временное устройство #2: Guition JC4827W543N
// Физический дисплей 480×272. Холст 480×480 (под целевой Waveshare AMOLED).
// На физический экран выводится viewport 480×272 в pixel-perfect 1:1, скроллится
// вертикально между y=0 (top) и y=208 (bottom) через каждые 5 сек.
extern Arduino_GFX*    gfx;
extern Arduino_Canvas* canvas;

void display_init();
void screen_dashboard();
void screen_alert(const AlertMsg& alert);
