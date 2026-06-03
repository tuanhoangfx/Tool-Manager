# P0020 folder migration: canonical path is E:\Dev\Tool\P0020-Data-Box
# If rename is blocked (IDE lock), this script can robocopy /MOV then leave a legacy junction.
$ErrorActionPreference = "Stop"
$toolRoot = "E:\Dev\Tool"
$oldName = "P0020-Workspace-Notes"
$newName = "P0020-Data-Box"
$oldPath = Join-Path $toolRoot $oldName
$newPath = Join-Path $toolRoot $newName

function Stop-P0020Dev {
  Get-NetTCPConnection -LocalPort 5177 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  try { pm2 delete p0020-dev 2>$null | Out-Null } catch {}
}

function Test-IsJunction([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  $item = Get-Item -LiteralPath $Path -Force
  return ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
}

function Test-IsEmptyDir([string]$Path) {
  return -not (Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -notin '.', '..' })
}

Stop-P0020Dev
Start-Sleep -Seconds 1

# Already canonical
if (-not (Test-Path -LiteralPath $oldPath) -and (Test-Path -LiteralPath $newPath) -and -not (Test-IsJunction $newPath)) {
  Write-Host "Done. Canonical path: $newPath"
  exit 0
}

# Legacy junction only
if (Test-IsJunction $oldPath) {
  $target = (Get-Item -LiteralPath $oldPath).Target
  if ($target -eq $newPath) {
    Write-Host "Legacy junction OK: $oldPath -> $newPath"
    exit 0
  }
}

if (Test-Path -LiteralPath $newPath) {
  if (Test-IsJunction $newPath) {
    cmd /c "rmdir `"$newPath`""
  } elseif (Test-Path -LiteralPath $oldPath) {
    Write-Host "Both folders exist; run robocopy /MOV migration manually or delete stub $oldPath after closing IDE."
    exit 2
  }
}

if (Test-Path -LiteralPath $oldPath) {
  if (Test-IsEmptyDir $oldPath) {
    cmd /c "rmdir `"$oldPath`""
    if (-not (Test-Path -LiteralPath $oldPath)) {
      cmd /c "mklink /J `"$oldPath`" `"$newPath`""
      Write-Host "Legacy junction: $oldPath -> $newPath"
      exit 0
    }
  }

  Write-Host "Renaming $oldPath -> $newPath"
  try {
    Rename-Item -LiteralPath $oldPath -NewName $newName
    Write-Host "Done. Canonical path: $newPath"
    exit 0
  } catch {
    Write-Host "Rename blocked. Use: robocopy `"$oldPath`" `"$newPath`" /E /MOV then remove empty $oldPath and mklink /J."
    exit 1
  }
}

throw "Missing P0020 folder under $toolRoot"
