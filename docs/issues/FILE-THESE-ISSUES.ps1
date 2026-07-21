# Files every issue in this folder to GitHub.
#
# WHAT THIS DOES: creates the labels "jules", "wave-2" and "wave-3" if they do not
# already exist, then creates one GitHub issue per .md file in this folder, using
# the TITLE and LABEL lines at the top of each file and everything after the "---"
# separator as the issue body.
#
# BEFORE RUNNING THIS, you must log in to GitHub once:
#     C:\Users\EJN\gh-cli\bin\gh.exe auth login
# Choose: GitHub.com  ->  HTTPS  ->  authenticate with a web browser.
#
# THEN RUN THIS FILE:
#     powershell -ExecutionPolicy Bypass -File docs\issues\FILE-THESE-ISSUES.ps1
#
# Anything labelled "jules" is picked up by the background coding agent.
# Wave 2 and Wave 3 issues are deliberately NOT labelled "jules" yet — label them
# only when you are ready for that wave to start.

$ErrorActionPreference = 'Stop'
$env:PATH = "C:\Users\EJN\gh-cli\bin;$env:PATH"
$repo = 'ejnburrows-rgb/otto'

# Check we are logged in before doing anything.
gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in to GitHub. Run this first:" -ForegroundColor Red
    Write-Host "    C:\Users\EJN\gh-cli\bin\gh.exe auth login" -ForegroundColor Yellow
    exit 1
}

# Create the labels. Ignore the error if a label already exists.
$labels = @(
    @{ name = 'jules';  color = '0E8A16'; desc = 'Wave 1 - ready for the background coding agent' },
    @{ name = 'wave-2'; color = 'FBCA04'; desc = 'Wave 2 - do not start until Wave 1 is merged' },
    @{ name = 'wave-3'; color = 'D93F0B'; desc = 'Wave 3 - do not start until Wave 2 is merged' }
)
foreach ($l in $labels) {
    gh label create $l.name --repo $repo --color $l.color --description $l.desc 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host "Created label: $($l.name)" }
    else { Write-Host "Label already exists: $($l.name)" }
}

# File one issue per .md file, in filename order (wave1 first).
Get-ChildItem -Path $PSScriptRoot -Filter '*.md' |
    Where-Object { $_.Name -ne 'README.md' } |
    Sort-Object Name |
    ForEach-Object {
        $lines = Get-Content $_.FullName
        $title = ($lines | Where-Object { $_ -like 'TITLE: *' } | Select-Object -First 1) -replace '^TITLE: ', ''
        $label = ($lines | Where-Object { $_ -like 'LABEL: *' } | Select-Object -First 1) -replace '^LABEL: ', ''

        # Body is everything after the first line that is exactly "---".
        $sep = ($lines | Select-String -Pattern '^---$' | Select-Object -First 1).LineNumber
        $body = ($lines[$sep..($lines.Count - 1)]) -join "`n"

        $tmp = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $tmp -Value $body -Encoding utf8

        Write-Host "`nFiling: $title  [$label]" -ForegroundColor Cyan
        gh issue create --repo $repo --title $title --label $label --body-file $tmp
        Remove-Item $tmp -Force
    }

Write-Host "`nDone. Review them here: https://github.com/$repo/issues" -ForegroundColor Green
