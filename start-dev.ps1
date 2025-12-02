# Script pour lancer le backend et le frontend dans deux fenetres PowerShell separees

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "backend"
$frontendPath = Join-Path $scriptPath "nuxt-app"

Write-Host "[*] Demarrage des services..." -ForegroundColor Green
Write-Host ""

# Verifier que les dossiers existent
if (-not (Test-Path $backendPath)) {
    Write-Host "[ERROR] Le dossier backend n'existe pas: $backendPath" -ForegroundColor Red
    Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "[ERROR] Le dossier nuxt-app n'existe pas: $frontendPath" -ForegroundColor Red
    Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Verifier que npm est installe
try {
    $npmVersion = npm --version 2>$null
    Write-Host "[OK] npm version: $npmVersion" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] npm n'est pas installe ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""

# Lancer le backend dans une nouvelle fenetre PowerShell
Write-Host "[*] Lancement du backend..." -ForegroundColor Cyan
$backendCommand = "cd '$backendPath'; Write-Host '[BACKEND] Port 3000' -ForegroundColor Yellow; Write-Host ''; npm run dev"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    $backendCommand
) -WindowStyle Normal

# Attendre un peu avant de lancer le frontend
Start-Sleep -Seconds 2

# Lancer le frontend dans une nouvelle fenetre PowerShell
Write-Host "[*] Lancement du frontend..." -ForegroundColor Cyan
$frontendCommand = "cd '$frontendPath'; Write-Host '[FRONTEND] Port 3001' -ForegroundColor Magenta; Write-Host ''; npm run dev"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    $frontendCommand
) -WindowStyle Normal

Write-Host ""
Write-Host "[OK] Les deux services ont ete lances dans des fenetres separees" -ForegroundColor Green
Write-Host "   - Backend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "   - Frontend: http://localhost:3001" -ForegroundColor Magenta
Write-Host ""
Write-Host "[INFO] Astuce: Fermez les fenetres PowerShell pour arreter les services" -ForegroundColor Gray
Write-Host ""
Write-Host "Appuyez sur une touche pour fermer cette fenetre..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

