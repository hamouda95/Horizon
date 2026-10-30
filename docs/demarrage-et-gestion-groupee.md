# Démarrage financier et gestion groupée

## Principe

Le budget décrit des flux de revenus et dépenses. Les comptes décrivent ce que le foyer détient ou doit déjà. Un solde de départ n’est ni un salaire, ni une dépense, ni un versement d’épargne réalisé ce mois-ci.

## Parcours de création

Le foyer et ses personnes restent le minimum nécessaire. Les catégories par défaut fonctionnent immédiatement ; leur personnalisation est repliée. Deux étapes sont facultatives :

- ajouter les comptes et valeurs de départ : banque, espèces, épargne, placements, crypto, dettes et autres avoirs ;
- prévoir les revenus attendus et le plafond de dépenses du mois.

Les montants sont déclarés en EUR. Un champ vide signifie « inconnu » ; zéro est une valeur connue. Un compte bancaire peut être à découvert. Les espèces et valorisations de placements ne peuvent pas être négatives. Une dette est saisie sans signe dans l’interface puis enregistrée et affichée négativement. La date du relevé accompagne chaque valeur connue.

La création du foyer, de ses catégories, de ses personnes, de ses comptes initiaux et de son budget initial forme une transaction. Une erreur ne doit pas laisser un foyer partiellement configuré. Les soldes initiaux ne créent aucune ligne d’opération. Les titulaires peuvent être ajustés ensuite dans la gestion des comptes ; l’utilisateur créateur reste l’identité propriétaire des fiches qu’il ajoute.

## Gestion quotidienne

Le menu « Comptes et avoirs » ouvre le module de gestion. Chaque fiche manuelle a des boutons **Modifier** et **Supprimer** visibles. L’édition comprend nom, source, type, titulaire, valeur/solde et date. Une sélection permet de supprimer plusieurs fiches (100 maximum) après confirmation précisant la suppression des opérations importées et rapprochements liés. Les opérations manuelles indépendantes restent conservées.

Revenus, Dépenses et l’historique importé utilisent un tableau commun :

- recherche de libellé/catégorie, période ou historique complet, filtre par nature ;
- pagination de 50 lignes ;
- sélection de la page ou des résultats, jusqu’à 500 opérations ;
- changement groupé de catégorie, de nature ou de personne ;
- suppression groupée avec confirmation.

Chaque action est atomique et vérifiée côté serveur. Un membre ne peut pas supprimer les imports appartenant à un autre membre, sauf droits du propriétaire du foyer déjà prévus. La présence d’une ligne inaccessible annule tout le lot. Changer de catégorie efface la sous-catégorie ancienne ; une catégorie de revenu ne peut pas être appliquée à des dépenses. Les montants et les dates ne changent pas pendant ces actions.

Une suppression d’opération importée retire aussi la transaction bancaire liée. Les soldes relevés sont conservés : supprimer une ligne de journal n’annule pas une vraie transaction bancaire.

## Épargne et investissements

Le type de flux « Versement / retrait de placement » est distinct d’un revenu et d’une dépense. Ses versements diminuent le reste budgétaire disponible et ses retraits l’augmentent. Les intérêts et dividendes réellement reçus sont des revenus standards ; une variation de valeur déclarée d’un placement n’en est pas un.

Les actifs en portefeuille sont des valeurs déclaratives datées. Il n’y a pas de cours de marché, de quantité de titres, de rendement fiscal ou de calcul automatique d’amortissement de dette dans cette version. Le capital d’un crédit et les mensualités sont distincts : le capital restant dû est une dette, une échéance de remboursement reste à saisir dans les échéances/opérations.

Les soldes des comptes et des espèces restent des relevés déclarés : les opérations manuelles ne sont pas encore rattachées à un compte et ne recalculent pas automatiquement ces soldes. Les transferts entre supports doivent être classés correctement pour ne pas gonfler les revenus/dépenses. L’import conserve ses contrôles de devise et de doublons.

## Cas couverts et limites

| Situation | Traitement |
| --- | --- |
| Départ sans compte, revenu connu ou relevé disponible | Création minimale ; données facultatives à compléter ensuite |
| Salaire régulier ou revenus variables | Budget prévisionnel facultatif, opérations réelles séparées |
| Plusieurs banques, compte joint ou compte individuel | Plusieurs fiches, accès par foyer et titulaire descriptif modifiable |
| Espèces à domicile ou portefeuille | Compte « Espèces » avec montant et date |
| Épargne déjà constituée | Solde initial sans revenu ni versement fictif |
| Placement ou crypto déjà détenu | Valorisation déclarée par support, distincte du budget mensuel |
| Découvert bancaire ou crédit en cours | Solde bancaire négatif ou fiche de dette distincte |
| Montant inconnu ou valeur nulle | Différence conservée entre absence de valeur et zéro |
| Mauvais compte ou import à corriger | Modification, fusion volontaire, suppression d’un ou plusieurs comptes |
| Mauvaise catégorie sur de nombreuses opérations | Recherche, sélection et action groupée |

Cette base couvre les grandes situations du budget de foyer sans prétendre couvrir tous les produits financiers. Les devises étrangères, portefeuilles de titres détaillés, transferts appariés et soldes automatiques par compte exigent des modules dédiés pour éviter des approximations comptables.

## Vérification

La migration ajoute les types de comptes et de flux, l’initialisation atomique et les deux RPC de gestion groupée en `SECURITY INVOKER`. Les scénarios `supabase/tests/starting_finances_and_bulk.sql` créent uniquement des utilisateurs fictifs, puis annulent toute la transaction. Ils vérifient les six supports, l’absence de revenu fictif, le budget initial, le rejet des valeurs invalides, les changements groupés, les droits inter-foyers et le nettoyage des imports supprimés.
