# Réinstaller la version corrigée sur le PC client

Oui : tu peux **désinstaller** l’ancienne version et **réinstaller** le Setup corrigé **1.0.1**.

## 1) Sur le PC admin (Windows) — générer le Setup

Dans le dossier du logiciel `zella-stock` (celui qui a déjà produit `Zella-Luxe-Setup-1.0.0.exe`) :

```powershell
cd chemin\vers\zella-stock
powershell -ExecutionPolicy Bypass -File .\scripts\pack-installer.ps1
```

Résultat attendu :

- `D:\zella-luxe-release\Zella-Luxe-Setup-1.0.1.exe`  
  ou `zella-stock\release\Zella-Luxe-Setup-1.0.1.exe`

Ce Setup embarque `resources\scripts\print-raw.ps1` **sans** blocage « USB hors ligne ».

## 2) Sur le PC client — désinstaller / réinstaller

1. Ferme Zella Luxe.
2. Windows → Applications → **désinstaller Zella Luxe**.
3. Copie `Zella-Luxe-Setup-1.0.1.exe` sur le client.
4. Installe.
5. Ouvre Zella → **Paramètres** → imprimante **Xprinter** → Enregistrer.
6. Imprime une étiquette.

Les données stock restent en local (SQLite / AppData) tant que tu ne coches pas une option qui les efface ; chaque PC garde sa propre base.

## Si tu n’as pas le PC admin sous la main

Applique le correctif sans rebuild : `scripts\APPLY-FIX-ETIQUETTES.cmd` (admin) sur le client — même script que dans le Setup 1.0.1.
