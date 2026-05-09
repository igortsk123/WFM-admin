#!/bin/bash
set -e

# Создание баз данных и пользователей для WFM
# Пароли берутся из переменных окружения (переданных в postgres контейнер)

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    -- n8n
    CREATE DATABASE n8n;
    CREATE USER n8n_user WITH PASSWORD '${N8N_DB_PASSWORD:-Pakar602}';
    GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n_user;

    -- svc_tasks
    CREATE DATABASE wfm_tasks;
    CREATE USER wfm_tasks_user WITH PASSWORD '${WFM_TASKS_DB_PASSWORD:-wfm_tasks_password}';
    GRANT ALL PRIVILEGES ON DATABASE wfm_tasks TO wfm_tasks_user;

    -- svc_users
    CREATE DATABASE wfm_users;
    CREATE USER wfm_users_user WITH PASSWORD '${WFM_USERS_DB_PASSWORD:-wfm_users_password}';
    GRANT ALL PRIVILEGES ON DATABASE wfm_users TO wfm_users_user;

    -- svc_notifications
    CREATE DATABASE wfm_notifications;
    CREATE USER wfm_notifications_user WITH PASSWORD '${WFM_NOTIFICATIONS_DB_PASSWORD:-wfm_notifications_password}';
    GRANT ALL PRIVILEGES ON DATABASE wfm_notifications TO wfm_notifications_user;

EOSQL

# Назначение прав на схемы
for DB_INFO in "n8n:n8n_user" "wfm_tasks:wfm_tasks_user" "wfm_users:wfm_users_user" "wfm_notifications:wfm_notifications_user"; do
    DB="${DB_INFO%%:*}"
    USER="${DB_INFO##*:}"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DB" <<-EOSQL
        GRANT ALL ON SCHEMA public TO $USER;
EOSQL
done
