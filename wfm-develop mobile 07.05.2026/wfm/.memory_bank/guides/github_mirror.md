# Зеркалирование в GitHub

Репозиторий WFM автоматически зеркалируется из GitVerse в GitHub при каждом push.

## Workflow

**Файл:** `.gitverse/workflows/mirror_to_gh.yaml`

**Триггер:** push любой ветки или тега

**Действия:**
1. Checkout с полной историей (`fetch-depth: 0`)
2. Настройка git пользователя
3. `git push --mirror --force` в GitHub репозиторий

## Секреты

Добавить в GitVerse: Settings → Secrets:

| Секрет | Описание |
|--------|----------|
| `GH_MIRROR_USER` | GitHub username |
| `GH_MIRROR_TOKEN` | GitHub Personal Access Token |
| `GH_MIRROR_REPO` | Адрес репозитория (например, `github.com/org/repo.git`) |

## Особенности

- **`--mirror`** — копирует все ветки, теги и refs
- **`--force`** — перезаписывает историю в GitHub (GitVerse — источник правды)
- **`fetch-depth: 0`** — нужен для полной истории коммитов
