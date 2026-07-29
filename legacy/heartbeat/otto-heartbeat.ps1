# LEGACY — archived 2026-07-28. Do not run in production workflows.
# Original purpose: local health ping + status markdown on a Windows PC.
# SECURITY: never write real sign-in codes into AGENT_STATUS.md or any log.
$ErrorActionPreference = 'SilentlyContinue'
$logDir = 'D:\Projects\otto-fresh\docs'
$logFile = Join-Path $logDir 'agent-heartbeat.log'
$statusFile = Join-Path $logDir 'AGENT_STATUS.md'

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

$ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$lines = @("--- $ts ---")

try {
    $prod = Invoke-WebRequest -Uri 'https://otto-kohl.vercel.app' -UseBasicParsing -TimeoutSec 20
    $lines += "PROD: OK ($($prod.StatusCode))"
} catch {
    $lines += "PROD: FAIL - $($_.Exception.Message)"
}

try {
    $local = Invoke-WebRequest -Uri 'http://localhost:8000' -UseBasicParsing -TimeoutSec 5
    $lines += "LOCAL: OK ($($local.StatusCode))"
} catch {
    $lines += "LOCAL: off"
}

if (Test-Path 'D:\Projects\otto-fresh\.git') {
    Push-Location 'D:\Projects\otto-fresh'
    $branch = git branch --show-current 2>$null
    $commit = git log --oneline -1 2>$null
    $dirty = if ((git status --porcelain 2>$null).Length -gt 0) { 'dirty' } else { 'clean' }
    $lines += "GIT: $branch $dirty $commit"
    Pop-Location
} else {
    $lines += "GIT: folder missing"
}

$lines += "FOLDER: $(if (Test-Path 'D:\Projects\otto-fresh\index.html') { 'OK' } else { 'MISSING' })"

Add-Content -Path $logFile -Value (($lines -join "`n") + "`n") -Encoding UTF8

if (Test-Path $logFile) {
    $all = Get-Content $logFile -Encoding UTF8
    if ($all.Count -gt 400) {
        $all | Select-Object -Last 300 | Set-Content $logFile -Encoding UTF8
    }
}

$last = Get-Content $logFile -Tail 6 -Encoding UTF8
$lastBlock = $last -join "`n"
@"
# OTTO Agent Heartbeat (LEGACY)

**Last check:** $ts
**Monitor:** Windows Task **OTTO-Heartbeat** (every 12 minutes) — optional local only

## Latest check

$lastBlock

## Important
- This monitor only checks whether a URL responds on your PC.
- Never store real PINs or secrets in this file.
- Live CRM: https://otto-kohl.vercel.app
"@ | Set-Content $statusFile -Encoding UTF8
