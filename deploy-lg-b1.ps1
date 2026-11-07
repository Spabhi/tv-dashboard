<#
.SYNOPSIS
  Packages and optionally deploys the LG webOS Smart TV Dashboard (.ipk) to an LG B1 77" OLED TV (webOS 6.0).

.EXAMPLE
  .\deploy-lg-b1.ps1
  # Installs @webos-tools/cli if missing and builds com.spabhi.tvdashboard_1.1.0_all.ipk

.EXAMPLE
  .\deploy-lg-b1.ps1 -TvIp "192.168.1.50" -Passphrase "ABCDEF"
  # Packages, configures SSH key with LG Developer Mode, installs, and launches on the LG B1 TV
#>
param(
  [string]$TvIp = "",
  [string]$DeviceName = "lgb1oled",
  [string]$Passphrase = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

# Ensure global npm bin directory exists
$NpmGlobalBin = Join-Path $env:APPDATA "npm"
if (-not (Test-Path $NpmGlobalBin)) {
  New-Item -ItemType Directory -Path $NpmGlobalBin -Force | Out-Null
}
if ($env:Path -notlike "*$NpmGlobalBin*") {
  $env:Path = "$NpmGlobalBin;$env:Path"
}

# 1. Check / Install LG webOS CLI (@webos-tools/cli)
if (-not (Get-Command ares-package -ErrorAction SilentlyContinue)) {
  Write-Host "[1/4] Installing official LG webOS CLI (@webos-tools/cli)..." -ForegroundColor Cyan
  npm install -g @webos-tools/cli
} else {
  Write-Host "[1/4] LG webOS CLI (ares-package) found." -ForegroundColor Green
}

# 2. Stage clean webOS application files into ./dist
$StageDir = Join-Path $ProjectRoot "dist\app"
$OutDir = Join-Path $ProjectRoot "dist"
if (Test-Path $StageDir) {
  Remove-Item $StageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $StageDir -Force | Out-Null

$AppFiles = @(
  "appinfo.json",
  "index.html",
  "styles.css",
  "app.js",
  "webOSTV.js",
  "webOSTV-dev.js",
  "icon.png",
  "largeIcon.png"
)

foreach ($file in $AppFiles) {
  Copy-Item (Join-Path $ProjectRoot $file) -Destination $StageDir -Force
}

# 3. Package .ipk for LG webOS 6.0 (LG B1 77" OLED)
Write-Host "[2/4] Packaging webOS .ipk bundle..." -ForegroundColor Cyan
ares-package $StageDir -o $OutDir

$IpkFile = Get-ChildItem -Path $OutDir -Filter "*.ipk" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($IpkFile) {
  Write-Host "Successfully built package: $($IpkFile.FullName)" -ForegroundColor Green
}

# 4. Optional deployment to LG B1 77" OLED TV over LAN
if ($TvIp -ne "") {
  Write-Host "[3/4] Registering LG B1 OLED TV ($TvIp) as '$DeviceName'..." -ForegroundColor Cyan
  ares-setup-device -a $DeviceName -i "username=prisoner" -i "host=$TvIp" -i "port=9922"

  if ($Passphrase -ne "") {
    Write-Host "Fetching SSH key from LG Developer Mode app..." -ForegroundColor Cyan
    ares-novacom --device $DeviceName --getkey --passphrase $Passphrase
  }

  Write-Host "[4/4] Installing & launching on LG B1 OLED TV..." -ForegroundColor Cyan
  ares-install --device $DeviceName $IpkFile.FullName
  ares-launch --device $DeviceName com.custom.dashboard
} else {
  Write-Host "Tip: Run '.\deploy-lg-b1.ps1 -TvIp <TV_IP_ADDRESS> -Passphrase <6_CHAR_KEY>' to install directly onto your LG B1 OLED TV." -ForegroundColor Yellow
}

