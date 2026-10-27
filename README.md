# Horizon — budget du foyer

Horizon est une application web de suivi budgétaire en français, développée avec React, TypeScript, Vite et Supabase. Elle est accessible sur [horizon-foyer.onrender.com](https://horizon-foyer.onrender.com/).

## Fonctionnalités disponibles

- Compte par adresse e-mail ou Google, profil et foyer personnel.
- Revenus et dépenses : saisie, modification, suppression, catégories et sous-catégories.
- Vue mensuelle et historique sur 12 mois, budget mensuel global, objectif de taux d'épargne et suggestions simples.
- Actualisation des données au retour dans l'application ou après reconnexion, dans les cas prévus par l'interface.

Le partage de foyer, les invitations, la synchronisation en temps réel, les enveloppes par catégorie et les mouvements d'épargne ne sont pas encore disponibles. Le QR code actuel contient seulement l'identifiant du foyer : il ne permet pas de le rejoindre.

## Organisation

- `render-app/` : application React/Vite déployée.
- `database/applied/` : copies de migrations déjà appliquées. Elles ne constituent pas nécessairement un historique complet permettant de reconstruire la base depuis zéro : vérifier le schéma initial et l'historique Supabase avant toute installation ou migration.
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
npm run build
npx tsc --noEmit
```

La mise en place d'un script `npm test` et d'une intégration continue est prévue dans une PR distincte.

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
