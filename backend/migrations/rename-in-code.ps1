# Script PowerShell pour renommer measurements_new en measurements dans le code
# À exécuter APRÈS avoir renommé les tables dans la base de données

Write-Host "=== Renommage measurements_new → measurements dans le code ===" -ForegroundColor Cyan
Write-Host ""

$files = @(
    "src/plugins/mqtt.ts",
    "src/modules/devices/routes.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Traitement de $file..." -ForegroundColor Yellow
        $content = Get-Content $file -Raw
        $originalContent = $content
        
        # Remplacer measurements_new par measurements
        $content = $content -replace 'measurements_new', 'measurements'
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file -Value $content -NoNewline
            Write-Host "  ✓ Modifié" -ForegroundColor Green
        } else {
            Write-Host "  - Aucun changement nécessaire" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠ Fichier non trouvé: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Renommage terminé !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "  1. Vérifier les changements avec: git diff" -ForegroundColor White
Write-Host "  2. Tester le backend: npm run dev" -ForegroundColor White
Write-Host "  3. Vérifier que les requêtes fonctionnent correctement" -ForegroundColor White

