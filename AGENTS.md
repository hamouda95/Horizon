# Horizon — guide pour les assistants de code

Application de budget de foyer en français : React 19 + TypeScript + Vite 8 (`render-app/`), Supabase (Postgres + RLS) pour les données.

## Commandes (depuis `render-app/`)

- `npm run dev` : serveur local (http://localhost:5173)
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` : à lancer tous les quatre avant chaque commit. La CI GitHub fait de même.

## Carte du code (`render-app/src/`)

- `app/Budget.tsx` : coquille de l'app (navigation, pages, dialogues). Gros fichier : chercher avec `grep -o` plutôt que le lire en entier.
- `lib/` : `client.ts` (Supabase), `database.types.ts`, `money.ts` (centimes), `dates.ts`, `period.ts`, `flow.ts` (natures d'opération), `finance-engine.ts`.
- `hooks/useHouseholdData.ts` : chargement et temps réel des données du foyer ; type `Entry` dans `hooks/household-data.ts`.
- `features/<domaine>/` : une page par dossier avec ses tests — `overview`, `operations` (registre, actions groupées par lots de 500 dans `bulk.ts`), `banking` (import de relevés, comptes), `classification` (règles « libellé contient → catégorie » dans `household_merchant_rules`, `rule-application.ts` ; dictionnaire `reference-data.ts` et suggestions automatiques locales `local-suggestions.ts` / `AiCategorizationPanel.tsx`, voir `docs/ia-categorisation.md`), `budget`, `categories`, `household`, `security` (double authentification TOTP, force du mot de passe ; la migration `mfa_required` exige le niveau aal2 dès qu’un facteur est vérifié), `obligations`, `goals`, `documents`, `loans`, `reports`.
- Langues et devise : dictionnaire `lib/ui-messages.ts` (clé = texte français, `en` et `ar` ; clés à `{0}`, `{1}` = messages composés). `lib/dom-translation.ts` traduit à l'affichage tout texte, infobulle et placeholder présent dans le dictionnaire, sans toucher à la mise en page ; tout nouveau texte visible doit y être ajouté (`[data-i18n-skip]` pour l'exclure). Montants avec `appCurrency()` (`lib/currency.ts`), jamais `'EUR'` en dur ; écrire « (€) » dans les libellés, le symbole est remplacé. En dev, `?lang=en` ou `?lang=ar` prévisualise une langue.
- `components/` : UI partagée (`ModuleUI.tsx`, `PeriodControl.tsx`, `Charts.tsx`). `styles/` : CSS.

## Base de données

- Migrations dans `supabase/migrations/` (appliquées en production), tests SQL dans `supabase/tests/`.
- Montants toujours en centimes entiers. Toute table est scopée par `household_id` avec RLS.
- Une migration doit être appliquée avant le frontend qui l'utilise. Préférer des changements côté interface quand c'est possible.

## Règles de travail

- Ne jamais committer de secret ; `.env.local` contient uniquement la clé publiable.
- Une branche et une PR par sujet ; Render déploie la branche `deploy/render-supabase`.
- `.horizon-preview/` est un dossier de prototypes locaux non suivi : ne pas le committer.
- Rapport d'audit et feuille de route : voir le document « Audit Horizon — octobre 2026 ».
