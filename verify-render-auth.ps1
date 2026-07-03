$ErrorActionPreference = 'Stop'

$baseUrl = 'https://zavala-express.onrender.com'
$loginUrl = "$baseUrl/api/zavala/login"
$stateUrl = "$baseUrl/api/zavala/state"
$usersUrl = "$baseUrl/api/zavala/users"

Write-Host "Checking health URL: $baseUrl"
$homeStatus = (Invoke-WebRequest -Uri $baseUrl -Method Get).StatusCode
Write-Host "HOME STATUS: $homeStatus"

$bodyObj = @{ user = 'admin'; pass = '1234' }
$bodyJson = $bodyObj | ConvertTo-Json -Compress

Write-Host "\nCalling login..."
$login = Invoke-RestMethod -Method Post -Uri $loginUrl -Body $bodyJson -ContentType 'application/json'
$login | ConvertTo-Json -Depth 6

if (-not $login.ok -or -not $login.token) {
  throw 'Login failed: no token returned.'
}

$token = [string]$login.token
Write-Host "\nTOKEN (prefix): $($token.Substring(0, [Math]::Min(8, $token.Length)))..."

Write-Host "\nCalling users endpoint..."
$users = Invoke-RestMethod -Method Get -Uri $usersUrl
$users | ConvertTo-Json -Depth 6

Write-Host "\nCalling state endpoint with Authorization header..."
try {
  $state = Invoke-RestMethod -Method Get -Uri $stateUrl -Headers @{ Authorization = "Bearer $token" }
  Write-Host "STATE STATUS: OK"
  $state | ConvertTo-Json -Depth 6
}
catch {
  Write-Host "STATE STATUS: FAIL"
  Write-Host "ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response -and $_.Exception.Response.Content) {
    try {
      $raw = $_.Exception.Response.Content.ReadAsStringAsync().Result
      Write-Host "RAW RESPONSE: $raw"
    }
    catch {
      Write-Host 'RAW RESPONSE: (not available)'
    }
  }
  throw
}
