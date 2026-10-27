# Horizon sur Render

Application React/Vite connectée à Supabase. Les variables de construction `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` sont des valeurs publiques. Ne jamais mettre de clé secrète ou service_role côté client.

Depuis ce dossier : `npm ci` puis `npm run build`. Render publie `render-app/dist` après `cd render-app && npm ci && npm run build`.

La base applique des politiques RLS par propriétaire. La synchronisation bancaire, les foyers partagés, la tarification et les comptes invités ne sont pas implémentés. Les données du prototype Sites ne sont pas automatiquement migrées.
