# Deploy / CI-CD

## Production
- 🌐 **https://wfm.prodstor.com** (Beyond Violet WFM Admin)
- 🔒 Let's Encrypt cert, auto-renew (certbot.timer 2× в день)
- 🐳 Container `wfm-admin:latest`, бинд `127.0.0.1:3004:3000`, restart=unless-stopped
- 🌉 nginx vhost `/etc/nginx/sites-available/wfm.prodstor.com` → proxy на 127.0.0.1:3004

## Сервер
- `root@193.160.208.41` (Ubuntu 22.04)
- Docker 27, nginx 1.18, certbot
- `/opt/wfm-admin/` — git clone
- 2GB swap (`/swapfile`, в /etc/fstab)

## Автодеплой через GitHub Actions

⚠️ **ВАЖНО:** деплой **полностью автоматический**. Я НЕ запускаю `ssh root@... docker build` руками.

После каждого push в main:
1. Job `typecheck` (на бесплатных GitHub runners ~45s) — `npx tsc --noEmit`
2. Если typecheck passed → job `deploy`:
   - SSH в сервер
   - `git fetch origin && git reset --hard origin/main`
   - `docker build -t wfm-admin:new`
   - Сохранить `:latest` как `:prev`
   - Stop+rm wfm-admin → run новый из `:new` (как `:latest`)
   - Smoke test https://wfm.prodstor.com/
   - При failure → rollback на `:prev`

Concurrency=cancel-in-progress: новый push отменяет текущий run.

## Workflow file
`.github/workflows/deploy.yml`

## После merge достаточно

```bash
gh run list --limit 1   # status
gh run view <id>        # детали (если failed)
```

Run обычно 30s (cache hit) — 5 мин (если меняется package.json).

## Manual rollback (если smoke test пропустил баг)

```bash
ssh root@193.160.208.41 'docker stop wfm-admin && docker rm wfm-admin && \
  docker tag wfm-admin:prev wfm-admin:latest && \
  docker run -d --name wfm-admin --restart unless-stopped \
    -p 127.0.0.1:3004:3000 wfm-admin:latest'
```

## Manual trigger workflow (без коммита)

```bash
gh workflow run deploy.yml
```

## GitHub secrets (не редактировать)

- `DEPLOY_SSH_KEY` — ed25519 private key
- `DEPLOY_HOST` = `193.160.208.41`
- `DEPLOY_USER` = `root`

Public key на сервере: `/root/.ssh/authorized_keys` с маркером `github-actions-deploy@wfm-admin`.

## Когда manual SSH всё-таки нужен

- Workflow упал и нужна срочная диагностика
- Авария на сервере (откат через :prev)
- Изменения в самом workflow файле (он не самопроверяется)
- Изменения в инфраструктуре: nginx/certbot/swap

## Что НЕ ломать на сервере

8 живых контейнеров — не трогать:
- med-frontend / med-backend / med-db (med.2opinion.online)
- sup-frontend (sup.prodstor.com)
- siberian-frontend / strapi / strapiDB (siberianclinic)
- remnanode (Remnawave VPN node)

5 nginx vhost-ов кроме wfm — тоже не трогать.

## Build optimizations (PR #171)

В `next.config.ts`: skip type-check + ESLint в build (выполняется в CI отдельным job'ом). Ускоряет server-side build с 4 мин до ~2:30.

## Defensive workflow guards (PR #172, #173)

После регрессии когда build падал но swap всё равно проходил:
- `if ! docker build ... > log 2>&1; then exit 1; fi` — portable exit-code check
- `docker image inspect wfm-admin:new` перед swap (sanity check)
- Никаких pipe-операций (`| tail`) на critical commands — теряют exit code в SSH session
