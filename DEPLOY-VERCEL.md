# Déployer Zella Luxe — 100 % gratuit (Vercel + Neon + Cloudinary)

Guide simple, étape par étape.

> **Hébergement officiel : Vercel + Neon + Cloudinary.**  
> L’ancien déploiement Render (`render.yaml`, `DEPLOY.md`) est **déprécié** — ne pas l’utiliser.

## Ce que tu obtiens (gratuit)

| Service | Rôle | Lien |
|---------|------|------|
| **Vercel** | Héberge le site | `https://zella-luxe.vercel.app` |
| **Neon** | Base PostgreSQL | (invisible, derrière le site) |
| **Cloudinary** | Photos des avis | (invisible) |

**Coût : 0 €/mois** pour démarrer.

---

## Étape 1 — GitHub (5 min)

1. Crée un compte sur [github.com](https://github.com)
2. Crée un repo **zella-luxe** (privé ou public)
3. Pousse le code :

```powershell
git init
git add .
git commit -m "Zella Luxe production"
git branch -M main
git remote add origin https://github.com/TON-USER/zella-luxe.git
git push -u origin main
```

---

## Étape 2 — Neon, base de données (5 min)

1. Va sur [neon.tech](https://neon.tech) → **Sign up** (gratuit)
2. **New Project** → nom : `zella-luxe`
3. Copie la **Connection string** (PostgreSQL)  
   Exemple : `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
4. Garde-la pour l’étape 4

---

## Étape 3 — Cloudinary, photos avis (5 min)

1. Va sur [cloudinary.com](https://cloudinary.com) → **Sign up** (gratuit)
2. Dashboard → note :
   - **Cloud name**
   - **API Key**
   - **API Secret**
3. Garde-les pour l’étape 4

---

## Étape 4 — Vercel, mise en ligne (10 min)

1. Va sur [vercel.com](https://vercel.com) → **Sign up** avec GitHub
2. **Add New…** → **Project**
3. Importe le repo **zella-luxe**
4. **Environment Variables** — ajoute :

| Nom | Valeur |
|-----|--------|
| `DATABASE_URL` | Connection string Neon (étape 2) |
| `ADMIN_PASSWORD` | Un mot de passe fort (ex. `ZellaAdmin2026!`) |
| `ADMIN_SESSION_SECRET` | Secret aléatoire ≥ 32 caractères (`openssl rand -hex 32`) |
| `CLOUDINARY_CLOUD_NAME` | Depuis Cloudinary |
| `CLOUDINARY_API_KEY` | Depuis Cloudinary |
| `CLOUDINARY_API_SECRET` | Depuis Cloudinary |
| `WHATSAPP_OWNER_TO` | Numéro du propriétaire (chiffres seuls), ex. `213666816878` (+213 666 816 878) |
| `WHATSAPP_PROVIDER` | `meta` (recommandé) ou `twilio` |
| `WHATSAPP_CLOUD_TOKEN` | Token permanent Meta Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID Meta |
| `WHATSAPP_TEMPLATE_NAME` | Nom du template UTILITY approuvé (ex. `nouvelle_commande`) |
| `WHATSAPP_TEMPLATE_LANG` | Langue du template (ex. `fr`) |

> **Obligatoire sur Vercel** : les 3 variables Cloudinary. Sans elles, l’upload de photos d’avis renvoie une erreur claire (503).  
> Ne pas définir `UPLOAD_DIR` sur Vercel — le disque serverless n’est pas persistant.

### WhatsApp Business — notifications commandes

À chaque commande, le serveur notifie le propriétaire via l’API WhatsApp Business (Meta Cloud API ou Twilio).

1. Crée une app [Meta for Developers](https://developers.facebook.com/) → WhatsApp → Cloud API  
2. Copie **Phone number ID** + **Permanent token**  
3. Crée un template **UTILITY** en français avec 8 variables body :
   - `{{1}}` n° commande · `{{2}}` client · `{{3}}` téléphone · `{{4}}` wilaya  
   - `{{5}}` livraison · `{{6}}` produits · `{{7}}` total · `{{8}}` date/heure  
4. Ajoute les variables Vercel ci-dessus, puis redéploie  

Sans template, Meta refuse souvent les messages hors fenêtre 24 h. Le template est la solution professionnelle fiable.

5. Clique **Deploy** → attends ~3 min
6. Tu obtiens : `https://zella-luxe.vercel.app` (ou un nom similaire)

---

## Étape 5 — Données initiales (1× seulement, **obligatoire**)

Après le **premier deploy réussi**, sur **ton PC** :

```powershell
# Dans .env local, mets la même DATABASE_URL que Neon
copy .env.example .env
# Édite .env : DATABASE_URL Neon + ADMIN_PASSWORD (optionnel en local)

npm run db:seed
```

Cela charge dans **Neon** : 58 wilayas, bureaux, produits, galerie, paramètres du site.

> **Important** : le build Vercel (`vercel-build`) exécute `prisma db push` pour créer les tables, mais **ne seed pas** les données. Sans `db:seed`, le site sera vide (pas de wilayas, produits, etc.).  
> Ne relance pas `db:seed` après de vraies commandes — ça efface tout.

---

## Connexion admin

- URL : `https://TON-SITE.vercel.app/admin/login`
- Mot de passe : celui que tu as mis dans `ADMIN_PASSWORD`

---

## Développement local (optionnel)

```powershell
docker compose up -d
copy .env.example .env
# DATABASE_URL=postgresql://zella:zella@localhost:5432/zellaluxe
npm run db:setup
npm run dev
```

Sans Docker : utilise directement l’URL Neon dans `.env` (attention à ne pas mélanger prod et tests).

---

## Limites du gratuit

| Limite | Détail |
|--------|--------|
| Domaine `.dz` | Payant (~1 500 DA/an) — tu gardes `*.vercel.app` |
| Trafic | Suffisant pour une boutique qui démarre |
| Neon | ~500 Mo de base |
| Cloudinary | ~25 crédits/mois (OK pour des avis) |

---

## Mises à jour du site

Chaque `git push` sur `main` → Vercel redéploie automatiquement.

---

## Où sont stockées les données ?

| Donnée | Emplacement |
|--------|-------------|
| Commandes, produits, avis (texte), wilayas, messages, réglages | **Neon** (PostgreSQL via `DATABASE_URL`) |
| Photos des avis clients | **Cloudinary** (`CLOUDINARY_*`) |
| Images produits / galerie initiales | **Git** (`public/images/…`) — servies par Vercel |
| Panier, langue | **localStorage** (navigateur uniquement) |

---

## Vérifier le déploiement

- Santé : `https://TON-SITE.vercel.app/api/health`  
  Doit retourner `{ "ok": true, "checks": { "database": true, "admin": true, "cloudinary": true } }`
- Admin : `https://TON-SITE.vercel.app/admin/login`

---

## Problèmes fréquents

| Problème | Solution |
|----------|----------|
| Build échoue (Prisma) | Vérifier `DATABASE_URL` dans Vercel Environment |
| Wilayas vides | Lancer `npm run db:seed` une fois |
| Admin ne connecte pas | Vérifier `ADMIN_PASSWORD` sur Vercel |
| Photo avis échoue | Vérifier les 3 variables Cloudinary sur Vercel |
| Health `cloudinary: false` | Ajouter `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

---

## Render (déprécié)

- **Ne plus utiliser Render** pour ce projet.
- `render.yaml` et `DEPLOY.md` sont conservés à titre d’archive uniquement.
- Vercel + Neon + Cloudinary = **gratuit** et recommandé.
