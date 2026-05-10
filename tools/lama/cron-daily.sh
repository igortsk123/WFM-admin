#!/bin/bash
# Daily LAMA snapshot fetch + regen + commit + push.
# Запускается через crontab в 22:00 UTC = 5:00 утра по Tomsk (UTC+7).
# См. tools/lama/README.md.
#
# Async fetcher (httpx + asyncio.Semaphore(3)) — production pattern из
# wfm mobile backend (daily_sync_service.sync_store v2).
# ~3-4x быстрее sequential fetch-snapshot.py.
#
# Должен лежать на сервере по пути /opt/wfm-admin/tools/lama/cron-daily.sh.
# Этот файл в репо — versioned копия для reference (не затирается git pull,
# т.к. server-side файл живёт по абсолютному пути и не отслеживается).

set -e
cd /opt/wfm-admin

LOG=/var/log/lama-fetch.log
echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) START ===" >> $LOG

# Sync с remote (на случай новых коммитов)
git pull origin main >> $LOG 2>&1

# Fetch + regen
python3 tools/lama/fetch-snapshot-async.py --concurrency 3 >> $LOG 2>&1
python3 tools/lama/regenerate-from-snapshots.py >> $LOG 2>&1
python3 tools/lama/build-review-tasks.py >> $LOG 2>&1
python3 tools/lama/build-planning-pool.py >> $LOG 2>&1
python3 tools/lama/analyze-distribution.py >> $LOG 2>&1
python3 tools/lama/build-backtest-baseline.py >> $LOG 2>&1

# Commit только если TS-файлы изменились
git add lib/mock-data/_lama-unassigned-blocks.ts \
        lib/mock-data/_lama-employee-zones.ts \
        lib/mock-data/_lama-employee-work-types.ts \
        lib/mock-data/_lama-fallback-medians.ts \
        lib/mock-data/_lama-review-tasks.ts \
        lib/mock-data/_lama-planning-pool.ts \
        lib/mock-data/_lama-distribution-stats.ts \
        lib/mock-data/_lama-backtest-baseline.ts

if git diff --cached --quiet; then
  echo "$(date -u +%H:%M:%S) NO CHANGES" >> $LOG
else
  BLOCKS=$(grep -c '^  { id:' lib/mock-data/_lama-unassigned-blocks.ts || true)
  STORES=$(grep -oE 'store_id: [0-9]+' lib/mock-data/_lama-unassigned-blocks.ts | sort -u | wc -l)
  PLAN_TASKS=$(grep -cE '^      \{ id: [0-9]+,' lib/mock-data/_lama-planning-pool.ts || true)
  PLAN_SHOPS=$(grep -cE '^  "[0-9]{4}": \{$' lib/mock-data/_lama-planning-pool.ts || true)
  DATE=$(date +%Y-%m-%d)
  git commit -m "chore(lama): daily snapshot $DATE — $BLOCKS blocks / $STORES stores, $PLAN_TASKS plan-tasks / $PLAN_SHOPS plan-shops (auto)" >> $LOG 2>&1
  git push origin main >> $LOG 2>&1
  echo "$(date -u +%H:%M:%S) PUSHED $BLOCKS blocks / $STORES stores, $PLAN_TASKS plan-tasks / $PLAN_SHOPS plan-shops" >> $LOG
fi

echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) END ===" >> $LOG
