# Horizon — budget du foyer

Prototype initial de gestion du budget familial.

## État

Cette branche conserve le code de la première version privée déployée sur ChatGPT Sites. Elle est fournie comme base de migration : **elle n'est pas prête pour un déploiement public indépendant**.

L'authentification dépend des en-têtes fournis par Sites et les données utilisent Cloudflare D1, pas Supabase. Ne pas déployer ce prototype hors de son environnement Sites : les en-têtes d'identité ne seraient pas fiables et le contrôle d'accès serait insuffisant.

## Cible

- Cloudflare Workers et déploiement automatisé depuis GitHub.
- Supabase Auth et Postgres, avec contrôle d'accès RLS par foyer.
- Variables d'environnement et secrets configurés côté hébergeur, jamais dans Git.
- Migrations versionnées, tests d'isolation entre foyers et vérification avant publication.

La connexion à Supabase, les foyers partagés, le mode invité, les paiements et la synchronisation bancaire ne sont pas encore implémentés. Le projet Supabase et son contenu n'ont pas encore pu être inspectés.

## Prototype

L'interface permet la configuration de catégories, l'ajout et la suppression d'opérations et la consultation d'un bilan mensuel. Le site privé existant est hébergé séparément ; cette copie ne modifie pas ses données.
