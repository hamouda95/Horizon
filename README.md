# Horizon — budget du foyer

Horizon est une application web de suivi budgétaire en français, développée avec React, TypeScript, Vite et Supabase. Elle est accessible sur [horizon-foyer.onrender.com](https://horizon-foyer.onrender.com/).

## Fonctionnalités disponibles

- Compte par adresse e-mail ou Google, profil et foyer personnel.
- Partage des foyers avec invitations temporaires, QR code, gestion des membres et sélection entre plusieurs foyers.
- Revenus et dépenses : saisie, modification, suppression, catégories et sous-catégories.
- Répartition des dépenses par catégorie avec filtre de détail sur la période sélectionnée.
- Vue mensuelle et historique sur 12 mois, budgets globaux et enveloppes par catégorie, objectif de taux d'épargne et suggestions simples.
- Actualisation des données au retour dans l'application ou après reconnexion, dans les cas prévus par l'interface.

Les mouvements d'épargne ne sont pas encore disponibles. Le partage donne aux membres l'accès aux opérations, catégories et budgets du foyer ; seul le propriétaire peut gérer les membres et les paramètres du foyer.

## Organisation

- `render-app/` : application React/Vite déployée.
- `database/applied/` : archives des migrations initiales, à utiliser avec l'historique réel Supabase.
- `supabase/migrations/` : migrations de partage et de synchronisation appliquées en production.
- `supabase/tests/household_sharing.sql` : scénarios RLS transactionnels annulés après vérification.
- `supabase/rollback/household_sharing.sql` : retrait du schéma de partage ; redéployer d'abord l'ancienne version de l'application avant de l'utiliser.
- `supabase/rollback/realtime_household_sync.sql` : retrait des tables ajoutées à la publication Realtime.
- `supabase/rollback/monthly_category_budgets.sql` : retrait des enveloppes mensuelles.
- L'ancien prototype Sites/D1 est conservé dans l'historique Git.

## Installation

Utiliser une version de Node.js compatible avec Vite 8, ainsi que npm.

```sh
cd render-app
npm ci
```

Créer `render-app/.env.local` avec l'URL et la clé publiable **d'un projet Supabase de développement** :

```dotenv
VITE_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=VOTRE_CLE_PUBLIABLE
```

Ces variables sont incluses dans le code distribué au navigateur. Ne jamais utiliser ici une clé secrète ou `service_role`. Configurer Supabase Auth et les URL de redirection autorisées pour l'environnement concerné. La base doit disposer des tables et politiques RLS attendues ; ne pas appliquer aveuglément les copies de migrations à une base existante.

```sh
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Les vérifications automatiques exécutent le lint, TypeScript, Vitest et la compilation sur GitHub Actions.

## Déploiement Render

Le service existant est un site statique configuré sur la branche `deploy/render-supabase` :

- Commande : `cd render-app && npm ci && npm run build`
- Dossier publié : `render-app/dist`
- Variables de build : `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`

La fusion vers `main` ne modifie pas automatiquement la branche surveillée par Render. Coordonner toute modification de branche ou synchronisation avec le déploiement et vérifier les redirections Supabase. Aucun secret ne doit être enregistré dans Git.

## Captures d'écran

Les captures de l'interface seront ajoutées avec des données de démonstration, sans informations personnelles.

## Licence

Voir [LICENSE](LICENSE).
