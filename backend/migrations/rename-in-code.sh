#!/bin/bash
# Script bash pour renommer measurements_new en measurements dans le code
# À exécuter APRÈS avoir renommé les tables dans la base de données

echo "=== Renommage measurements_new → measurements dans le code ==="
echo ""

files=(
    "src/plugins/mqtt.ts"
    "src/modules/devices/routes.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Traitement de $file..."
        if grep -q "measurements_new" "$file"; then
            sed -i 's/measurements_new/measurements/g' "$file"
            echo "  ✓ Modifié"
        else
            echo "  - Aucun changement nécessaire"
        fi
    else
        echo "  ⚠ Fichier non trouvé: $file"
    fi
done

echo ""
echo "✅ Renommage terminé !"
echo ""
echo "📋 Prochaines étapes:"
echo "  1. Vérifier les changements avec: git diff"
echo "  2. Tester le backend: npm run dev"
echo "  3. Vérifier que les requêtes fonctionnent correctement"

