# Fix étiquettes PC client (A4 OK, étiquettes KO)

## Diagnostic

| Impression | Chemin | Sur le client |
|---|---|---|
| Feuille A4 / ticket HTML | Pilote Windows normal | **Marche** → câble + imprimante OK |
| Étiquettes TSPL | Script `print-raw.ps1` | **Bloque** si ancienne version (« USB hors ligne ») |

L’imprimante est branchée. Le problème n’est **pas** le câble : c’est l’ancien script étiquettes encore installé sur ce PC.

## Correctif en 1 clic (recommandé)

1. Sur le **PC client**, ferme **Zella Luxe**.
2. Copie tout le dossier `zella-stock/scripts/` (au minimum) :
   - `APPLY-FIX-ETIQUETTES.cmd`
   - `print-raw.ps1`
   - `TEST-ETIQUETTE.cmd` (optionnel)
3. Clic droit sur **`APPLY-FIX-ETIQUETTES.cmd`** → **Exécuter en tant qu’administrateur**.
4. Rouvre Zella → **Paramètres** → choisis l’**Xprinter** (pas PDF / OneNote) → Enregistrer.
5. Réessaie **Étiquettes**.

## Test sans ouvrir Zella

Double-clic sur `TEST-ETIQUETTE.cmd`.  
Si une étiquette « ZELLA TEST » sort → le PC est prêt ; sinon regarde la section ci-dessous.

## Si ça échoue encore

1. Windows → **Imprimantes et scanners** → imprimante Xprinter.
2. Pilote : **Generic / Text Only** (Manufacturer Generic).
3. Port : **USB00x** (pas « FILE: », pas WSD).
4. Elle ne doit pas être « Hors connexion ».
5. USB direct (pas hub), imprimante allumée, rouleau étiquettes chargé.

## Remplacement manuel

Remplace :

```
%LOCALAPPDATA%\Programs\Zella Luxe\resources\scripts\print-raw.ps1
```

par le nouveau `scripts\print-raw.ps1`.

## Depuis le PC admin (rebuild)

Si tu as `D:\zella-luxe-release\Zella-Luxe-Setup-1.0.0.exe` déjà reconstruit avec ce script :  
copie cet exe sur le client → réinstalle → Paramètres → Xprinter → étiquettes.
