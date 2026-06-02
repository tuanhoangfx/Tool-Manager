# Opens SQL Editor and prints batch file paths for manual run (fallback).
# Prefer: pnpm supabase:query:file supabase/browser-batch-N.sql after SUPABASE_DB_URL is set.
$root = Split-Path $PSScriptRoot -Parent
1..8 | ForEach-Object {
  $f = Join-Path $root "supabase\browser-batch-$_.sql"
  if (Test-Path $f) { Write-Host "Batch $_ : $f ($((Get-Item $f).Length) bytes)" }
}
