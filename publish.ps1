# DDB-FORK: copy the built module into Foundry's Data/modules/ddb5e-sheets.
# Usage: powershell -File publish.ps1 [-DataPath <FoundryUserData>]   (run `npm run build` first)
#        npm run publish:sandbox   (= -DataPath C:/Users/brian/dev-cache/foundry-dev-data)
#
# The Foundry user-data root (the folder that CONTAINS Data/, Config/, Logs/)
# is resolved from, in order:
#   0. -DataPath - wins over everything below (the ddb-next dev sandbox)
#   1. foundry-data-path-config.json next to this script — { "dataPath": "..." }
#      (gitignored; copy foundry-data-path-config_example.json to create it)
#   2. the FOUNDRY_DATA_PATH environment variable
#   3. the default Windows location, %LOCALAPPDATA%\FoundryVTT
param([string]$DataPath)

$ErrorActionPreference = 'Stop'

$dist = Join-Path $PSScriptRoot 'dist'
$configFile = Join-Path $PSScriptRoot 'foundry-data-path-config.json'

$dataRoot = $null
$dataRootFrom = $null
if ($DataPath) {
  $dataRoot = $DataPath
  $dataRootFrom = '-DataPath'
}
if (-not $dataRoot -and (Test-Path $configFile)) {
  $dataRoot = (Get-Content $configFile -Raw | ConvertFrom-Json).dataPath
  $dataRootFrom = 'foundry-data-path-config.json'
}
if (-not $dataRoot -and $env:FOUNDRY_DATA_PATH) {
  $dataRoot = $env:FOUNDRY_DATA_PATH
  $dataRootFrom = 'FOUNDRY_DATA_PATH'
}
if (-not $dataRoot) {
  $dataRoot = Join-Path $env:LOCALAPPDATA 'FoundryVTT'
  $dataRootFrom = 'default %LOCALAPPDATA%\FoundryVTT'
}
if (-not (Test-Path (Join-Path $dataRoot 'Data'))) {
  throw "Foundry user-data root '$dataRoot' (from $dataRootFrom) has no Data\ folder - refusing to publish."
}
$dataRoot = (Resolve-Path $dataRoot).Path

$target = Join-Path $dataRoot 'Data\modules\ddb5e-sheets'
Write-Host "Publish target: $target"
Write-Host "  data root from $dataRootFrom"

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
