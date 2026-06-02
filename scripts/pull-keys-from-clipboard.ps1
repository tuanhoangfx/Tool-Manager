# After copying anon key in Supabase Dashboard, run from P0020 root:
#   powershell -File scripts/pull-keys-from-clipboard.ps1 -Role anon
param(
  [ValidateSet("anon", "service")]
  [string]$Role = "anon"
)

$clip = (Get-Clipboard -Raw).Trim()
if ($clip -notmatch '^eyJ') {
  Write-Error "Clipboard does not look like a JWT. Copy the key from Dashboard first."
  exit 1
}

$envPath = Join-Path $PSScriptRoot "..\.env.local"
$lines = if (Test-Path $envPath) { Get-Content $envPath -Raw } else { "" }

$url = "https://bklxcjrkhrevdcqjscku.supabase.co"
$updates = @{
  "VITE_SUPABASE_URL" = $url
}
if ($Role -eq "anon") { $updates["VITE_SUPABASE_ANON_KEY"] = $clip }
else { $updates["SUPABASE_SERVICE_ROLE_KEY"] = $clip }

foreach ($kv in $updates.GetEnumerator()) {
  $pattern = "(?m)^$($kv.Key)=.*$"
  if ($lines -match "(?m)^$($kv.Key)=") {
    $lines = $lines -replace $pattern, "$($kv.Key)=$($kv.Value)"
  } else {
    $lines = "$lines`n$($kv.Key)=$($kv.Value)"
  }
}

Set-Content -Path $envPath -Value $lines.TrimEnd() -NoNewline
Add-Content -Path $envPath -Value "`n"
Write-Host "Updated $envPath ($Role key, length $($clip.Length))"
