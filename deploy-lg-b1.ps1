<#
.SYNOPSIS
  Packages and optionally deploys the LG webOS Smart TV Dashboard (.ipk) to an LG B1 77" OLED TV (webOS 6.0).
#>
param(
  [string]$TvIp = "",
  [string]$DeviceName = "lgb1oled",
  [string]$Passphrase = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

$NpmGlobalBin = Join-Path $env:APPDATA "npm"
if (-not (Test-Path $NpmGlobalBin)) {
  New-Item -ItemType Directory -Path $NpmGlobalBin -Force | Out-Null
}
if ($env:Path -notlike "*$NpmGlobalBin*") {
  $env:Path = "$NpmGlobalBin;$env:Path"
}

if (-not (Get-Command ares-package -ErrorAction SilentlyContinue)) {
  Write-Host "[1/3] Installing official LG webOS CLI (@webos-tools/cli)..." -ForegroundColor Cyan
  npm install -g @webos-tools/cli
} else {
  Write-Host "[1/3] LG webOS CLI (ares-package) found." -ForegroundColor Green
}

Write-Host "[2/3] Running ares-package directly in project folder..." -ForegroundColor Cyan
ares-package . -e ".git" -e "deploy-lg-b1.ps1" -e "README.md" -e ".gitignore"

$IpkFile = Get-ChildItem -Path $ProjectRoot -Filter "*.ipk" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($IpkFile) {
  Write-Host "Successfully built package: $($IpkFile.FullName)" -ForegroundColor Green
}

if ($TvIp -ne "") {
  Write-Host "[3/3] Deploying to LG B1 OLED TV ($TvIp) as '$DeviceName'..." -ForegroundColor Cyan
  ares-setup-device -a $DeviceName -i "username=prisoner" -i "host=$TvIp" -i "port=9922"

  if ($Passphrase -ne "") {
    ares-novacom --device $DeviceName --getkey --passphrase $Passphrase
  }

  ares-install --device $DeviceName $IpkFile.FullName
  ares-launch --device $DeviceName com.custom.dashboard
}
