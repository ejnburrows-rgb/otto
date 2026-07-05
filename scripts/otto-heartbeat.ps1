# OTTO Plumbing CRM - automated health heartbeat (every 12 min via Task Scheduler)
$ErrorActionPreference = 'SilentlyContinue'
$logDir = 'D:\Projects\otto-fresh\docs'
$logFile = Join-Path $logDir 'agent-heartbeat.log'
$statusFile = Join-Path $logDir 'AGENT_STATUS.md'

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

$ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$lines = @("--- $ts ---")

try {
    $prod = Invoke-WebRequest -Uri 'https://dream-cooling-crm.vercel.app' -UseBasicParsing -TimeoutSec 20
    $hasUrgent = $prod.Content -match 'viewUrgentHub'
    $hasPhoto = $prod.Content -match 'photoScanCreateCustomer'
    $lines += "PROD: OK ($($prod.StatusCode)) urgent=$hasUrgent photo=$hasPhoto"
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
# OTTO Agent Heartbeat

**Last check:** $ts
**Monitor:** Windows Task **OTTO-Heartbeat** (every 12 minutes)

## Latest check

$lastBlock

## How to know the monitor is running
1. Open ``D:\Projects\otto-fresh\docs\AGENT_STATUS.md`` - timestamp updates every ~12 min.
2. Open ``D:\Projects\otto-fresh\docs\agent-heartbeat.log`` - new lines at bottom.
3. Task Scheduler -> **OTTO-Heartbeat** -> Last Run Time.

## Important
- This monitor checks OTTO health automatically on your PC.
- The AI agent only works when you are in this chat. It does not run 24/7 alone.

## Live app
https://dream-cooling-crm.vercel.app

## PINs
Owner 0721 | Field 0715
"@ | Set-Content $statusFile -Encoding UTF8