#!/usr/bin/env pwsh
# Auto-cleanup: удаляет git worktrees + .next/cache.
# Запускается:
#   - вручную через `pnpm clean` (см. package.json)
#   - автоматом через Stop hook в .claude/settings.local.json
#
# Worktrees Agent'ов с isolation="worktree" живут в .claude/worktrees/.
# Каждая = ~800 MB (свой node_modules + .next). После 5-10 агентов
# репо распухает на десятки ГБ. Регулярная очистка обязательна.

$ErrorActionPreference = "SilentlyContinue"
$root = (Resolve-Path "$PSScriptRoot\..").Path
$wtRoot = Join-Path $root ".claude\worktrees"

# 1. Git worktree teardown — чистим метаданные .git/worktrees/
& git -C $root worktree prune 2>&1 | Out-Null
$worktrees = & git -C $root worktree list 2>&1
foreach ($line in $worktrees) {
    if ($line -match '^(.*\\\.claude\\worktrees\\agent-[a-f0-9]+)\s') {
        & git -C $root worktree remove -f -f $matches[1] 2>&1 | Out-Null
    }
}

# 2. Физическое удаление через robocopy mirror trick (обходит Windows
#    260-char filename limit и filename-too-long errors на nested node_modules).
if (Test-Path $wtRoot) {
    $sizeBefore = (Get-ChildItem $wtRoot -Recurse -Force | Measure-Object -Property Length -Sum).Sum
    $mbBefore = [Math]::Round($sizeBefore / 1MB, 0)
    $empty = Join-Path $env:TEMP "wfm-cleanup-empty"
    New-Item -ItemType Directory -Force -Path $empty | Out-Null
    & robocopy $empty $wtRoot /MIR /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null
    Remove-Item $wtRoot -Force -Recurse
    Remove-Item $empty -Force -Recurse
    if ($mbBefore -gt 0) {
        Write-Output "Cleaned worktrees: $mbBefore MB"
    }
}

# 3. .next/cache (build artefacts) — переcоберётся при следующем `npx next build`
$nextCache = Join-Path $root ".next\cache"
if (Test-Path $nextCache) {
    $cacheSize = (Get-ChildItem $nextCache -Recurse -Force | Measure-Object -Property Length -Sum).Sum
    $cacheMb = [Math]::Round($cacheSize / 1MB, 0)
    if ($cacheMb -gt 200) {
        Remove-Item $nextCache -Force -Recurse
        Write-Output "Cleaned .next/cache: $cacheMb MB"
    }
}
