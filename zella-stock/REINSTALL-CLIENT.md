# Réinstaller la version corrigée sur le PC client

Oui : tu peux **désinstaller** l’ancienne version et **réinstaller** le Setup corrigé **1.0.1**.

## 1) Sur le PC admin (Windows) — générer le Setup

**Important :** ne lance pas ça depuis `C:\WINDOWS\system32`.  
Ouvre PowerShell, puis va dans le vrai dossier du projet (souvent) :

```powershell
cd C:\Users\hp\Projects\zella-luxe\zella-stock
```

Si tu ne sais pas où il est, cherche-le :

```powershell
Get-ChildItem -Path C:\Users,D:\ -Filter pack-installer.ps1 -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
```

ou :

```powershell
Get-ChildItem -Path C:\Users,D:\ -Filter Zella-Luxe-Setup*.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
```

Puis, **dans le dossier `zella-stock`** qui contient `scripts\pack-installer.ps1` :

```powershell
cd C:\Users\hp\Projects\zella-luxe\zella-stock
powershell -ExecutionPolicy Bypass -File .\scripts\pack-installer.ps1
```

Si `pack-installer.ps1` n’existe pas encore sur ce PC : récupère d’abord le code (git pull de la branche `cursor/fix-etiquettes-client-8a46`, ou copie le dossier `scripts` depuis GitHub).

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
