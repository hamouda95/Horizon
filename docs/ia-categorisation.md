# Suggestions de catégories par IA

La page Catégories propose, pour les opérations que les règles du foyer et le dictionnaire n'ont pas su classer (nature « À vérifier » ou catégorie fourre-tout comme « Autres dépenses »), une catégorie, une sous-catégorie et une nature suggérées par Claude. L'utilisateur choisit celles à appliquer ; rien n'est modifié sans sa validation. Les choix cohérents par marchand peuvent être mémorisés comme règles du foyer.

## Fonctionnement

- Fonction serveur `supabase/functions/ai-categorize` (Deno). Elle relit les opérations demandées avec la session de l'utilisateur (RLS), masque IBAN, e-mails et longs numéros, appelle le modèle `claude-opus-5-5` avec une réponse JSON imposée, puis ne renvoie que des catégories existantes du foyer et du bon type.
- Logique pure partagée et testée : `supabase/functions/_shared/ai-categorize.ts` (tests dans `render-app/src/features/classification/ai-categorize.test.ts`).
- Interface : `render-app/src/features/classification/AiCategorizationPanel.tsx`, par lots de 100 opérations.
- Consentement explicite demandé au premier usage, enregistré dans les métadonnées du compte (`ai_consent`) et vérifié aussi par la fonction serveur.
- Si la fonction n'est pas installée ou si la clé manque, l'app affiche un message et le reste de l'application fonctionne normalement.

## Installation (une fois)

Prérequis : Supabase CLI connecté au projet, et une clé API Anthropic (console.anthropic.com).

```sh
supabase login
supabase link --project-ref VOTRE_REF_PROJET
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy ai-categorize
```

Les origines autorisées (CORS) sont celles de `supabase/functions/_shared/banking.ts` : le site Render et `http://localhost:5173`.

## Coût et confidentialité

- Environ quelques centimes pour 100 opérations ; les consignes et la liste des catégories sont mises en cache.
- Données envoyées : libellé masqué, montant, date et sens. Anthropic doit figurer comme sous-traitant dans la politique de confidentialité ; signer l'accord de traitement des données et vérifier les conditions d'utilisation des données de l'API.
- À ajouter avant l'ouverture au public : un plafond d'appels par foyer et par mois, et la réservation à l'offre Horizon+.
