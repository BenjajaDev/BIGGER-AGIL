<#
.SYNOPSIS
  Prueba de humo posterior a build.ps1: levanta el sistema compilado SIN instalar el servicio.
  Comprueba que los módulos nativos (better-sqlite3, serialport, sharp) cargan en Windows.
#>
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Build = Join-Path $PSScriptRoot 'build'
$Node = Join-Path $Build 'node\node.exe'
$ApiDir = Join-Path $Build 'api'
$WebDir = Join-Path $Build 'web'
$Port = 3123

foreach ($p in $Node, (Join-Path $ApiDir 'dist\setup.js'), (Join-Path $ApiDir 'dist\server.js'), (Join-Path $WebDir 'index.html')) {
  if (-not (Test-Path $p)) { throw "Falta $p; ejecute installer\build.ps1 primero." }
}

$Tmp = Join-Path ([IO.Path]::GetTempPath()) ("bigger-smoke-" + [guid]::NewGuid().ToString('N'))

# Igual que el instalador: una COPIA en una carpeta con espacios (Copy-Item, como Inno Setup, no
# conserva enlaces), para detectar dependencias que solo se resuelven dentro de la carpeta de build.
$App = Join-Path $Tmp 'Program Files\BIGGER Agil'
New-Item -ItemType Directory -Force -Path $App | Out-Null
foreach ($d in 'node', 'api', 'web') { Copy-Item -Recurse -Force (Join-Path $Build $d) (Join-Path $App $d) }
$Node = Join-Path $App 'node\node.exe'
$ApiDir = Join-Path $App 'api'
$WebDir = Join-Path $App 'web'

$Data = Join-Path $Tmp 'datos'
$Config = Join-Path $Tmp 'config.env'
$PinFile = Join-Path $Tmp 'pin.txt'
New-Item -ItemType Directory -Force -Path $Tmp | Out-Null
Set-Content -LiteralPath $PinFile -Value '4321' -NoNewline -Encoding ascii

$proc = $null
try {
  Write-Host '==> setup.js'
  & $Node (Join-Path $ApiDir 'dist\setup.js') --config $Config --data-dir $Data --web-dir $WebDir --pin-file $PinFile --seed-catalog
  if ($LASTEXITCODE -ne 0) { throw "setup.js terminó con código $LASTEXITCODE" }
  if (-not (Test-Path $Config)) { throw 'setup.js no creó el archivo de configuración.' }

  Write-Host "==> arrancando servidor en el puerto $Port"
  $env:BIGGER_CONFIG = $Config
  $env:PORT = "$Port"
  $log = Join-Path $Tmp 'server.log'
  $proc = Start-Process -FilePath $Node -ArgumentList ('"' + (Join-Path $ApiDir 'dist\server.js') + '"') `
    -WorkingDirectory $ApiDir -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $log -RedirectStandardError (Join-Path $Tmp 'server.err.log')

  $deadline = (Get-Date).AddSeconds(60)
  $ok = $false
  while ((Get-Date) -lt $deadline) {
    if ($proc.HasExited) { throw "El servidor terminó con código $($proc.ExitCode)." }
    try {
      $r = Invoke-WebRequest -Uri "http://localhost:$Port/api/v1/tables" -UseBasicParsing -TimeoutSec 5
      if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $ok) { throw 'El servidor no respondió 200 en /api/v1/tables en 60 s.' }
  Write-Host 'API responde 200.'

  $homePage = Invoke-WebRequest -Uri "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 10
  if ($homePage.Content -notmatch '<div id="root"') { throw 'GET / no devolvió la web (falta <div id="root").' }
  Write-Host 'La web se sirve correctamente. Prueba de humo OK.'
}
catch {
  foreach ($f in 'server.log', 'server.err.log') {
    $path = Join-Path $Tmp $f
    if (Test-Path $path) { Write-Host "--- $f ---"; Get-Content $path -Tail 40 }
  }
  throw
}
finally {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  Remove-Item Env:BIGGER_CONFIG, Env:PORT -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 500
  Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue
}
