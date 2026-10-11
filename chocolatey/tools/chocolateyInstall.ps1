Write-Host "BPM4B install starting..." -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$tools = Split-Path -Parent $MyInvocation.MyCommand.Definition
$package = Split-Path -Parent $tools

# Locate the installer shipped alongside the nuspec (build with `npm run build`).
$installer = Get-ChildItem -Path $tools -Filter "BPM4B-Setup*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $installer) {
  Write-Warning "No bundled installer found. Building it is not possible offline — install manually from releases."
  Write-Host "Download BPM4B-Setup.exe, drop it into $tools, then re-run: choco install bpm4b" -ForegroundColor Yellow
  return
}

Write-Host "Installing $($installer.Name)..." -ForegroundColor Cyan
$arguments = "/S"
$proc = Start-Process -FilePath $installer.FullName -ArgumentList $arguments -Wait -PassThru
if ($proc.ExitCode -ne 0) {
  throw "BPM4B installer exited with code $($proc.ExitCode)"
}

Write-Host "BPM4B installed. Run 'bpm4b --help' or launch from the Start menu." -ForegroundColor Green
Write-Host "ffmpeg is required for audio processing: choco install ffmpeg" -ForegroundColor Yellow
