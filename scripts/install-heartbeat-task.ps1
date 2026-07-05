# Install OTTO heartbeat - runs every 12 minutes
$taskName = 'OTTO-Heartbeat'
$script = 'D:\Projects\otto-fresh\scripts\otto-heartbeat.ps1'

schtasks /Delete /TN $taskName /F 2>$null | Out-Null

$cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$script`""
schtasks /Create /TN $taskName /TR $cmd /SC MINUTE /MO 12 /F | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Output "OK: Task $taskName runs every 12 minutes"
} else {
    Write-Output "WARN: schtasks failed (exit $LASTEXITCODE). Running heartbeat manually only."
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script
Write-Output "Log: D:\Projects\otto-fresh\docs\agent-heartbeat.log"
Write-Output "Status: D:\Projects\otto-fresh\docs\AGENT_STATUS.md"