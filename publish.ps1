# DDB-FORK: copy the built module into Foundry's Data/modules/ddb5e-sheets.
# Usage: powershell -File publish.ps1   (run `npm run build` first)
$ErrorActionPreference = 'Stop'

$dist = Join-Path $PSScriptRoot 'dist'
$target = 'C:\Users\brian\AppData\Local\FoundryVTT\Data\modules\ddb5e-sheets'

if (-not (Test-Path (Join-Path $dist 'module.json'))) {
  throw "dist/module.json not found - run 'npm run build' first."
}

$manifest = Get-Content (Join-Path $dist 'module.json') -Raw | ConvertFrom-Json
if ($manifest.id -ne 'ddb5e-sheets') {
  throw "dist manifest id is '$($manifest.id)', expected 'ddb5e-sheets' - refusing to publish."
}

robocopy $dist $target /MIR /NFL /NDL /NJH /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

Write-Host "Published ddb5e-sheets v$($manifest.version) -> $target"
