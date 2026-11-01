# Suggestions automatiques de catégories

La page Catégories propose, pour les opérations encore à classer (nature « À vérifier » ou catégorie fourre-tout comme « Autres dépenses »), une catégorie, une sous-catégorie et une nature. L'utilisateur choisit celles à appliquer ; rien n'est modifié sans sa validation. Les choix cohérents par marchand peuvent être mémorisés comme règles du foyer.

Tout est calculé dans le navigateur : aucun service payant, aucune donnée envoyée à un tiers.

## Les trois sources, par ordre de confiance

1. **Règles du foyer** (`household_merchant_rules`) : « le libellé contient X → catégorie ». Toujours prioritaires.
2. **Dictionnaire de référence** (`render-app/src/features/classification/reference-data.ts`) : plus de 700 commerçants, organismes et mots-clés français (supermarchés, restauration, transports, énergie, télécoms, assurances, santé, impôts, achats en ligne, logement, voyages, banque, épargne, placements, revenus…). Le terme le plus précis l'emporte. Les catégories absentes du foyer retombent sur des alias (`categoryAliases`), par exemple « Shopping » → « Autres dépenses ». Le dictionnaire sert aussi lors des imports de relevés.
3. **Apprentissage local** (`local-classifier.ts`) : un modèle de similarité entraîné sur les opérations déjà classées du foyer. Il ne propose rien pour les virements (personnes ou comptes du foyer), trop ambigus pour être devinés.

Le moteur est dans `local-suggestions.ts`, l'interface dans `AiCategorizationPanel.tsx`.

## Enrichir le dictionnaire

Ajouter des termes dans `reference-data.ts` (minuscules, sans accents), puis lancer `npm test` : `reference-data.test.ts` vérifie la couverture et les faux positifs connus. Éviter les prénoms, noms de famille et mots courants (« avis », « paul », « epargne » seul…).

## Option Claude (non utilisée)

La fonction serveur `supabase/functions/ai-categorize` appelle Claude via l'API Anthropic, qui est payante. Elle est déployée mais l'application ne l'utilise pas. Pour l'activer plus tard : ajouter le secret `ANTHROPIC_API_KEY` dans Supabase (Edge Functions → Secrets) et brancher le panneau sur `supabase.functions.invoke('ai-categorize', …)`.
