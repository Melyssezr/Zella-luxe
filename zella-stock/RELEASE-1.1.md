# Zella Luxe 1.1.0 — étiquettes + scan variante

## Nouveautés
1. **Étiquette structurée** : marque, réf, nom, couleur, pointure/taille, prix — texte plus petit, code-barres à droite (plus de chevauchement).
2. **Champs selon type** :
   - Chaussures / escarpins… → Couleur + Pointure
   - Sacs → Couleur
   - Valises → Couleur + Taille
3. **Code variante** `ZL/REF/Couleur/Pointure` sur chaque étiquette.
4. **Scan pistolet** : prend directement la vraie variante (plus besoin de re-choisir couleur/pointure).

## Build Setup sur PC admin Windows

Colle dans PowerShell :

```powershell
cd C:\Users\hp\Projects\zella-luxe\zella-stock
$u = "https://raw.githubusercontent.com/Melyssezr/Zella-luxe/cursor/fix-etiquettes-client-8a46/zella-stock/scripts/install-v1.1-windows.ps1"
Invoke-WebRequest $u -OutFile .\scripts\install-v1.1-windows.ps1 -UseBasicParsing
powershell -ExecutionPolicy Bypass -File .\scripts\install-v1.1-windows.ps1
```

Résultat attendu : `D:\zella-luxe-release\Zella-Luxe-Setup-1.1.0.exe`

## Sur le PC client
1. Désinstaller Zella Luxe
2. Installer `Zella-Luxe-Setup-1.1.0.exe`
3. Paramètres → Xprinter
4. **Réimprimer les étiquettes** (anciens codes sans variante ne sélectionnent plus automatiquement si plusieurs tailles)
5. Scanner → variante directe

## Important
Les anciennes étiquettes qui n’ont que la référence produit ne peuvent pas choisir la pointure toutes seules s’il y a plusieurs variantes. Réimprime avec 1.1.
