param(
  [Parameter(Mandatory=$true)]
  [string]$Url
)

$ErrorActionPreference = 'Stop'

if (-not ($Url -match '^https?://')) {
  throw "La URL debe iniciar con http:// o https://"
}

$desktopPath = 'desktop/config.json'
$mobilePath = 'mobile/capacitor.config.json'

$desktop = Get-Content -Raw -LiteralPath $desktopPath
$desktop = $desktop -replace '"appUrl"\s*:\s*"[^"]*"', ('"appUrl": "' + $Url + '"')
Set-Content -LiteralPath $desktopPath -Encoding UTF8 -Value $desktop

$mobile = Get-Content -Raw -LiteralPath $mobilePath
$mobile = $mobile -replace '"url"\s*:\s*"[^"]*"', ('"url": "' + $Url + '"')
Set-Content -LiteralPath $mobilePath -Encoding UTF8 -Value $mobile

Write-Output "OK: desktop/config.json"
Write-Output "OK: mobile/capacitor.config.json"
