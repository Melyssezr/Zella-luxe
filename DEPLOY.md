# Déployer Zella Luxe sur Render

> **DÉPRÉCIÉ** — Ce projet utilise désormais **Vercel + Neon + Cloudinary**.  
> Voir [`DEPLOY-VERCEL.md`](./DEPLOY-VERCEL.md). Ne pas déployer sur Render.

Guide pas à pas pour héberger le site en production.

## Prérequis

- Compte [Render](https://render.com) (gratuit pour tester, **Starter** recommandé pour un vrai site)
- Compte [GitHub](https://github.com)
- Git installé sur votre PC

---

## 1. Préparer le code sur GitHub

```bash
git init
git add .
git commit -m "Prepare production deploy"
git branch -M main
git remote add origin https://github.com/VOTRE-USER/zella-luxe.git
git push -u origin main
```

> Ne commitez **jamais** le fichier `.env` (déjà ignoré par Git).

---

## 2. Développement local (PostgreSQL)

```bash
# Démarrer Postgres
docker compose up -d

# Copier la config
copy .env.example .env

# Créer les tables + données initiales
npm run db:setup

# Lancer le site
npm run dev
```

Site : http://localhost:3000  
Admin : http://localhost:3000/admin/login

---

## 3. Déployer sur Render (Blueprint)

1. Allez sur [dashboard.render.com](https://dashboard.render.com)
2. **New** → **Blueprint**
3. Connectez votre repo GitHub `zella-luxe`
4. Render détecte `render.yaml` et crée :
   - **Base PostgreSQL** (`zella-db`)
   - **Web Service** (`zella-luxe`)
   - **Disque persistant** pour les photos d’avis

5. Cliquez **Apply** et attendez le premier deploy (~5–10 min)

---

## 4. Après le premier deploy

### Mot de passe admin

Render génère automatiquement `ADMIN_PASSWORD`.

1. Dashboard Render → service **zella-luxe** → **Environment**
2. Copiez la valeur de `ADMIN_PASSWORD`
3. Connectez-vous sur `https://votre-app.onrender.com/admin/login`

### Peupler la base (wilayas, produits, etc.)

**Une seule fois**, dans le shell Render (service → **Shell**) :

```bash
npm run db:seed
```

> ⚠️ Ne relancez pas `db:seed` en production après des vraies commandes — cela réinitialise les données.

---

## 5. Domaine personnalisé (optionnel)

1. Render → service **zella-luxe** → **Settings** → **Custom Domains**
2. Ajoutez `www.zellaluxe.dz` (ou votre domaine)
3. Configurez le CNAME chez votre registrar vers `zella-luxe.onrender.com`

> Le plan **Free** ne supporte pas les domaines custom — passez au plan **Starter**.

---

## Variables d’environnement

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Auto (PostgreSQL Render) |
| `ADMIN_PASSWORD` | Auto-généré (modifiable dans Environment) |
| `UPLOAD_DIR` | `/var/data/uploads` (disque persistant) |
| `NODE_ENV` | `production` |

---

## Commandes utiles

| Commande | Usage |
|----------|--------|
| `npm run build` | Build production (local) |
| `npm run start` | Démarrer en mode production |
| `npm run db:push` | Appliquer le schéma Prisma |
| `npm run db:seed` | Données initiales (1× en prod) |

---

## Architecture production

```
Internet → Render (HTTPS)
              ↓
         Next.js (port $PORT)
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
 PostgreSQL         Disque /var/data
 (commandes,         (photos avis)
  produits,
  wilayas)
```

Images produits : fichiers dans `public/images/` (inclus dans Git).

---

## Dépannage

| Problème | Solution |
|----------|----------|
| Build échoue sur Prisma | Vérifier `DATABASE_URL` et logs build |
| Admin ne se connecte pas | Vérifier `ADMIN_PASSWORD` dans Environment |
| Wilayas vides | Lancer `npm run db:seed` dans le Shell Render |
| Site lent au réveil | Plan Free = spin-down après 15 min → passer Starter |
| Erreur Prisma colonne | Redéployer après `prisma db push` |

---

## Coût estimé (Render)

| Ressource | Plan | ~Prix/mois |
|-----------|------|------------|
| Web Service | Starter | ~7 $ |
| PostgreSQL | Basic 256MB | ~6 $ |
| Disque 1 GB | Inclus | ~0 $ |

**Total ~13 $/mois** pour un site toujours en ligne avec base de données.
