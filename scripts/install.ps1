# Infi installer for Windows (NSIS bundle)
#
# Usage:
#   irm https://khanhthanhdev.github.io/infi/install.ps1 | iex
#
# Environment overrides:
#   $env:INFI_VERSION   Pin a specific version (e.g. 0.1.0). Defaults to latest release.

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = 'khanhthanhdev/infi'

if (-not [Environment]::Is64BitOperatingSystem) {
    throw 'Infi requires 64-bit Windows.'
}
$Arch = 'x64'

if ($env:INFI_VERSION) {
    $Version = $env:INFI_VERSION
} else {
    try {
        $latest = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -UseBasicParsing
    } catch {
        throw "Could not query the latest release from GitHub: $($_.Exception.Message)"
    }
    $Version = ($latest.tag_name -replace '^v', '')
}

if (-not $Version) {
    throw 'Could not determine the latest Infi version. Set $env:INFI_VERSION=x.y.z and retry.'
}

$Asset = "Infi_${Version}_${Arch}-setup.exe"
$Url   = "https://github.com/$Repo/releases/download/v$Version/$Asset"

$TmpDir = Join-Path $env:TEMP "infi-install-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null
$TmpPath = Join-Path $TmpDir $Asset

Write-Host "Downloading Infi v$Version ($Arch) ..."
Write-Host "  $Url"
Invoke-WebRequest -Uri $Url -OutFile $TmpPath -UseBasicParsing

Write-Host 'Running the installer ...'
$proc = Start-Process -FilePath $TmpPath -ArgumentList '/S' -Wait -PassThru
if ($proc.ExitCode -ne 0) {
    throw "Installer exited with code $($proc.ExitCode)."
}

Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue

Write-Host ''
Write-Host 'Infi installed. Launch it from the Start menu, or run:'
Write-Host '    & "$env:LOCALAPPDATA\Programs\Infi\infi.exe"'
