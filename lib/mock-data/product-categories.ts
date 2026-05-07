import type { ProductCategory } from "@/lib/types";

/**
 * @endpoint GET /api/product-categories
 * Full 53-category FMCG taxonomy (as per LAMA standards).
 * Используется для тегирования задач — не путать с WorkType.group.
 *
 * `zone_id` — привязка к LAMA-зоне (см. zones.ts, id 100+):
 *   100 Фреш 1, 101 Фреш 2, 102 Бакалея, 103 Заморозка, 104 Бытовая химия,
 *   105 Non-Food, 106 Алкоголь, 107 ЗОЖ, 108 Кондитерка-чай-кофе,
 *   109 Пиво-чипсы, 110 Напитки б/а
 */
export const MOCK_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 1,  code: "MILK",           name: "Молочка",                      zone_id: 101 },
  { id: 2,  code: "BREAD",          name: "Хлебобулочка",                 zone_id: 100 },
  { id: 3,  code: "GROCERY",        name: "Бакалея",                      zone_id: 102 },
  { id: 4,  code: "SPIRITS",        name: "Алкоголь крепкий",             zone_id: 106 },
  { id: 5,  code: "WINE",           name: "Вино",                         zone_id: 106 },
  { id: 6,  code: "BEER",           name: "Пиво",                         zone_id: 109 },
  { id: 7,  code: "CONFECTIONERY",  name: "Кондитерка",                   zone_id: 108 },
  { id: 8,  code: "CHOCOLATE",      name: "Шоколад",                      zone_id: 108 },
  { id: 9,  code: "FRUIT_VEG",      name: "Овощи и фрукты",               zone_id: 100 },
  { id: 10, code: "GREENS",         name: "Зелень",                       zone_id: 100 },
  { id: 11, code: "FROZEN",         name: "Заморозка",                    zone_id: 103 },
  { id: 12, code: "MEAT_FRESH",     name: "Мясо охлаждённое",             zone_id: 100 },
  { id: 13, code: "MEAT_FROZEN",    name: "Мясо замороженное",            zone_id: 103 },
  { id: 14, code: "FISH_FRESH",     name: "Рыба охлаждённая",             zone_id: 100 },
  { id: 15, code: "FISH_FROZEN",    name: "Рыба замороженная",            zone_id: 103 },
  { id: 16, code: "POULTRY",        name: "Птица",                        zone_id: 100 },
  { id: 17, code: "CHEESE",         name: "Сыры",                         zone_id: 101 },
  { id: 18, code: "SAUSAGE",        name: "Колбасы и деликатесы",         zone_id: 100 },
  { id: 19, code: "SNACKS_SALTY",   name: "Снеки солёные",                zone_id: 109 },
  { id: 20, code: "SNACKS_SWEET",   name: "Снеки сладкие",                zone_id: 108 },
  { id: 21, code: "CHIPS",          name: "Чипсы",                        zone_id: 109 },
  { id: 22, code: "NUTS",           name: "Орехи и сухофрукты",           zone_id: 102 },
  { id: 23, code: "SOFT_DRINKS",    name: "Безалкогольные напитки",       zone_id: 110 },
  { id: 24, code: "JUICES",         name: "Соки и нектары",               zone_id: 110 },
  { id: 25, code: "WATER",          name: "Воды",                         zone_id: 110 },
  { id: 26, code: "ENERGY",         name: "Энергетики",                   zone_id: 110 },
  { id: 27, code: "TEA",            name: "Чай",                          zone_id: 108 },
  { id: 28, code: "COFFEE",         name: "Кофе",                         zone_id: 108 },
  { id: 29, code: "READY_FOOD",     name: "Кулинария готовая",            zone_id: 100 },
  { id: 30, code: "SEMI_FINISHED",  name: "Полуфабрикаты",                zone_id: 103 },
  { id: 31, code: "BABY_FOOD",      name: "Детское питание",              zone_id: 102 },
  { id: 32, code: "HEALTH_FOOD",    name: "Здоровое питание",             zone_id: 107 },
  { id: 33, code: "SAUCES",         name: "Соусы и приправы",             zone_id: 102 },
  { id: 34, code: "OILS",           name: "Масла и уксусы",               zone_id: 102 },
  { id: 35, code: "GRAINS",         name: "Крупы",                        zone_id: 102 },
  { id: 36, code: "PASTA",          name: "Макаронные изделия",           zone_id: 102 },
  { id: 37, code: "CANNED",         name: "Консервация",                  zone_id: 102 },
  { id: 38, code: "SEAFOOD",        name: "Икра и морепродукты",          zone_id: 100 },
  { id: 39, code: "HOUSEHOLD_CHEM", name: "Бытовая химия",                zone_id: 104 },
  { id: 40, code: "LAUNDRY",        name: "Стиральные порошки",           zone_id: 104 },
  { id: 41, code: "DISHWASH",       name: "Средства для посуды",          zone_id: 104 },
  { id: 42, code: "HYGIENE",        name: "Личная гигиена",               zone_id: 104 },
  { id: 43, code: "COSMETICS",      name: "Косметика",                    zone_id: 104 },
  { id: 44, code: "PERFUME",        name: "Парфюмерия",                   zone_id: 104 },
  { id: 45, code: "DENTAL",         name: "Зубная паста и щётки",         zone_id: 104 },
  { id: 46, code: "DIAPERS",        name: "Подгузники и салфетки",        zone_id: 104 },
  { id: 47, code: "PET",            name: "Товары для животных",          zone_id: 104 },
  { id: 48, code: "STATIONERY",     name: "Канцтовары",                   zone_id: 105 },
  { id: 49, code: "HOME_GOODS",     name: "Товары для дома",              zone_id: 105 },
  { id: 50, code: "TEXTILE",        name: "Текстиль",                     zone_id: 105 },
  { id: 51, code: "SEASONAL",       name: "Сезонные товары",              zone_id: 105 },
  { id: 52, code: "HOLIDAY",        name: "Товары к праздникам",          zone_id: 105 },
  { id: 53, code: "NON_FOOD_OTHER", name: "Прочее non-food",              zone_id: 105 },

  // ─── ТехПродЗдрав — производимые изделия. id 100+ чтобы не пересекаться с FMCG.
  { id: 100, code: "PILLOW_12_MODULAR", name: "Подушка 12-модульная 40×50", org_id: "org-tehprod" },
];
