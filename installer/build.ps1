<#
.SYNOPSIS
  Construye Instalar-BIGGER-Agil-<version>.exe (carpeta installer\Output).
.DESCRIPTION
  Usado por CI (.github/workflows/instalador.yml) y ejecutable en un PC con Windows 10/11 x64.
  IMPORTANTE: debe correr en Windows, para que las dependencias nativas
  (better-sqlite3, serialport, sharp) se instalen con binarios win32-x64.
  Requisitos: Node (ver .nvmrc) y pnpm en el PATH, y acceso a internet.
#>
param(
  [string]$Version = '0.0.0'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ProgressPreference = 'SilentlyContinue'

# --- Versiones fijadas (cambiarlas implica actualizar también el hash) ---
$NodeFallbackVersion = '22.23.5'   # se usa si .nvmrc no trae una versión exacta (p. ej. "22")
$WinSwVersion = '2.12.0'
$WinSwSha256 = '05b82d46ad331cc16bdc00de5c6332c1ef818df8ceefcd49c726553209b3a0da'

$InstallerDir = $PSScriptRoot
$RepoRoot = Split-Path -Parent $InstallerDir
$Build = Join-Path $InstallerDir 'build'
$Downloads = Join-Path $Build '_downloads'

function Invoke-Native {
  param([string]$What, [scriptblock]$Command)
  Write-Host "==> $What"
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "Falló: $What (código $LASTEXITCODE)" }
}

function Get-Sha256([string]$Path) {
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

if ($PSVersionTable.PSVersion.Major -ge 6 -and -not $IsWindows) {
  throw 'Este script debe ejecutarse en Windows (los módulos nativos se instalan para win32-x64).'
}

Set-Location $RepoRoot

# --- Limpiar compilaciones anteriores ---
if (Test-Path $Build) { Remove-Item -Recurse -Force $Build }
New-Item -ItemType Directory -Force -Path $Build, $Downloads | Out-Null

# --- 1. Compilar web y API ---
Invoke-Native 'pnpm install' { pnpm install --frozen-lockfile }
Invoke-Native 'compilar web' { pnpm --filter '@bigger/web' build }
Invoke-Native 'compilar API' { pnpm --filter '@bigger/api' build }

# --- 2. API con dependencias de producción (módulos nativos de Windows) ---
$ApiOut = Join-Path $Build 'api'
Invoke-Native 'pnpm deploy (API)' { pnpm --filter '@bigger/api' deploy --prod --legacy $ApiOut }
# deploy respeta .gitignore/"files": copiar explícitamente lo que el servicio necesita.
$ApiSrc = Join-Path $RepoRoot 'apps\api'
foreach ($dir in 'dist', 'drizzle') {
  $target = Join-Path $ApiOut $dir
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
  Copy-Item -Recurse -Force (Join-Path $ApiSrc $dir) $target
}
Copy-Item -Force (Join-Path $ApiSrc 'package.json') (Join-Path $ApiOut 'package.json')
foreach ($required in 'dist\server.js', 'dist\setup.js', 'drizzle', 'node_modules') {
  if (-not (Test-Path (Join-Path $ApiOut $required))) { throw "Falta $required en la carpeta de la API." }
}

# --- 3. Web ---
$WebDist = Join-Path $RepoRoot 'apps\web\dist'
if (-not (Test-Path (Join-Path $WebDist 'index.html'))) { throw 'apps\web\dist\index.html no existe.' }
Copy-Item -Recurse -Force $WebDist (Join-Path $Build 'web')

# --- 4. Node portable (versión exacta, hash verificado) ---
$nvm = (Get-Content (Join-Path $RepoRoot '.nvmrc') -Raw).Trim().TrimStart('v')
$NodeVersion = if ($nvm -match '^\d+\.\d+\.\d+$') { $nvm } else { $NodeFallbackVersion }
Write-Host "==> Node portable v$NodeVersion"
$nodeZipName = "node-v$NodeVersion-win-x64.zip"
$nodeBase = "https://nodejs.org/dist/v$NodeVersion"
$nodeZip = Join-Path $Downloads $nodeZipName
Invoke-WebRequest -Uri "$nodeBase/$nodeZipName" -OutFile $nodeZip
$sums = (Invoke-WebRequest -Uri "$nodeBase/SHASUMS256.txt").Content -split "`n"
$line = $sums | Where-Object { $_ -match "\s$([regex]::Escape($nodeZipName))\s*$" } | Select-Object -First 1
if (-not $line) { throw "SHASUMS256.txt no lista $nodeZipName." }
$expected = ($line -split '\s+')[0].ToLowerInvariant()
$actual = Get-Sha256 $nodeZip
if ($actual -ne $expected) { throw "SHA256 de Node no coincide. Esperado $expected, obtenido $actual." }
$nodeExtract = Join-Path $Downloads 'node'
Expand-Archive -LiteralPath $nodeZip -DestinationPath $nodeExtract -Force
$nodeRoot = Join-Path $nodeExtract "node-v$NodeVersion-win-x64"
$NodeOut = Join-Path $Build 'node'
New-Item -ItemType Directory -Force -Path $NodeOut | Out-Null
Copy-Item -Force (Join-Path $nodeRoot 'node.exe') $NodeOut
foreach ($f in 'LICENSE') {
  if (Test-Path (Join-Path $nodeRoot $f)) { Copy-Item -Force (Join-Path $nodeRoot $f) $NodeOut }
}

# --- 5. WinSW (hash fijado) ---
Write-Host "==> WinSW v$WinSwVersion"
$winswExe = Join-Path $Downloads 'WinSW-x64.exe'
Invoke-WebRequest -Uri "https://github.com/winsw/winsw/releases/download/v$WinSwVersion/WinSW-x64.exe" -OutFile $winswExe
$winswActual = Get-Sha256 $winswExe
if ($winswActual -ne $WinSwSha256) {
  throw "SHA256 de WinSW-x64.exe no coincide. Esperado $WinSwSha256, obtenido $winswActual. Si cambió la versión, verifique el archivo y actualice `$WinSwSha256 en installer\build.ps1."
}
$ServiceOut = Join-Path $Build 'service'
New-Item -ItemType Directory -Force -Path $ServiceOut | Out-Null
Copy-Item -Force $winswExe (Join-Path $ServiceOut 'BIGGER-Agil.exe')
Copy-Item -Force (Join-Path $InstallerDir 'service\BIGGER-Agil.xml') (Join-Path $ServiceOut 'BIGGER-Agil.xml')

Remove-Item -Recurse -Force $Downloads

# --- 6. Inno Setup ---
$iscc = $null
$cmd = Get-Command iscc -ErrorAction SilentlyContinue
if ($cmd) { $iscc = $cmd.Source }
if (-not $iscc) {
  $candidates = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'),
    (Join-Path $env:ProgramFiles 'Inno Setup 6\ISCC.exe')
  )
  $iscc = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $iscc) {
  Invoke-Native 'instalar Inno Setup' { choco install innosetup -y --no-progress }
  $iscc = Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'
  if (-not (Test-Path $iscc)) { throw 'No se encontró ISCC.exe después de instalar Inno Setup.' }
}
Invoke-Native "compilar instalador $Version" { & $iscc "/DAppVersion=$Version" (Join-Path $InstallerDir 'bigger.iss') }

$exe = Get-ChildItem (Join-Path $InstallerDir 'Output') -Filter 'Instalar-BIGGER-Agil-*.exe' | Select-Object -First 1
if (-not $exe) { throw 'No se generó el instalador.' }
Write-Host "Listo: $($exe.FullName)"
