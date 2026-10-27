# Horizon sur Render

Application React/Vite connectée à Supabase. Les variables de construction `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` sont des valeurs publiques. Ne jamais mettre de clé secrète ou service_role côté client.

Depuis ce dossier : `npm ci` puis `npm run build`. Render publie `render-app/dist` après `cd render-app && npm ci && npm run build`.

Les accès aux foyers partagés sont contrôlés par RLS et une appartenance explicite. Les invitations expirent après sept jours. Les changements du foyer se synchronisent en temps réel pour les membres connectés. Le budget mensuel permet aussi de fixer une enveloppe pour chaque catégorie de dépenses. La synchronisation bancaire, la tarification et les comptes invités ne sont pas implémentés. Les données du prototype Sites ne sont pas automatiquement migrées.

Le menu propose désormais quatre espaces dédiés au budget du foyer : échéances et provisions, objectifs d’épargne liés aux mouvements, bilan mensuel et documents partagés. Les documents utilisent le bucket privé `household_documents` (10 Mo par fichier, PDF/JPEG/PNG/WEBP) et des politiques RLS qui limitent l’accès aux membres du foyer. Migration appliquée : `20261027234705_household_objectives_documents_obligations.sql`; procédure de retour arrière : `supabase/rollback/household_objectives_documents_obligations.sql`.
