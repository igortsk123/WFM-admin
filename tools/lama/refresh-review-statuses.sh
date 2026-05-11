#!/bin/bash
# Hourly LAMA refresh для review queue.
# Запускается через crontab: 0 * * * * /opt/wfm-admin/tools/lama/refresh-review-statuses.sh
#
# Lightweight — только перетягивает task statuses (для свежих ON_REVIEW),
# не делает полный fetch shop+employees+tasks. Daily fetch остаётся
# отдельным cron'ом (cron-daily.sh, 22:00 UTC).
#
# Должен лежать на сервере по пути /opt/wfm-admin/tools/lama/refresh-review-statuses.sh.
# Этот файл в репо — versioned копия для reference.

set -e
cd /opt/wfm-admin

LOG=/var/log/lama-review-refresh.log
echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) START ===" >> $LOG

# Sync с remote (на случай новых коммитов)
git pull origin main >> $LOG 2>&1

# 1. Refresh task statuses в snapshot in-place
python3 tools/lama/refresh-review-statuses.py --concurrency 4 >> $LOG 2>&1

# 2. Перегенерировать review-tasks mock из обновлённого snapshot'а
python3 tools/lama/build-review-tasks.py >> $LOG 2>&1

# 3. Commit только если TS-файл изменился
git add lib/mock-data/_lama-review-tasks.ts

if git diff --cached --quiet; then
  echo "$(date -u +%H:%M:%S) NO CHANGES" >> $LOG
else
  REVIEW=$(grep -c 'review_state: "ON_REVIEW"' lib/mock-data/_lama-review-tasks.ts || true)
  ACCEPTED=$(grep -c 'review_state: "ACCEPTED"' lib/mock-data/_lama-review-tasks.ts || true)
  TIME=$(date -u +%H:%M)
  git commit -m "chore(lama): hourly review refresh $TIME — $REVIEW on review / $ACCEPTED accepted (auto)" >> $LOG 2>&1
  git push origin main >> $LOG 2>&1
  echo "$(date -u +%H:%M:%S) PUSHED $REVIEW on review / $ACCEPTED accepted" >> $LOG
fi

echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) END ===" >> $LOG
