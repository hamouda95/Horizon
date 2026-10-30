# Architecture des modules Horizon

## Diagnostic des captures

Les réglages et messages explicatifs occupaient le premier écran avant les chiffres. Les poignées de réorganisation du menu étaient permanentes, le contenu commercial du pied de menu masquait des rubriques, et les modules utilisaient des en-têtes, tailles et espacements différents. La page des prêts pouvait présenter une composition difficile à lire ; le résumé mobile à trois colonnes faisait se chevaucher de grands montants.

## Organisation retenue

- Accueil : vue d’ensemble, budget, bilan.
- Opérations : entrées, sorties, comptes, prêts, échéances.
- Outils et réglages : catégories, objectifs, documents, astuces, accessibles par un contrôle explicite. La personnalisation du menu est un mode volontaire.
- Une URL stable par page et prise en charge du retour/précédent du navigateur. Les anciennes préférences de navigation restent reconnues.

`ModuleUI.tsx` fournit les en-têtes, indicateurs, sections et volets. `workspace.css` porte la présentation de travail, distincte de la feuille historique. Le volet utilise un dialogue natif : arrière-plan inerte, gestion du focus et fermeture par Échap. Les fonctions métier et contrôles serveur existants sont conservés.

## Premier écran de chaque module

| Module | Informations prioritaires | Actions et détail |
| --- | --- | --- |
| Vue d’ensemble | Patrimoine connu, budget restant, catégories prioritaires | Détail des comptes et méthode de calcul à la demande ; catégories triées par consommation du plafond, six au premier niveau |
| Budget | Enveloppes définies, consommation, marge des catégories configurées, alertes | Tableau mensuel/annuel ; configuration et dérogations dans un volet |
| Entrées / sorties | Total des mouvements, part courante, nombre à vérifier | Recherche, nature, période, liste compacte et sélection groupée |
| Comptes | Avoirs connus par devise, nombre de comptes, soldes manquants | Solde à côté du compte ; import, catégorisation et outils avancés séparés ; gestion dans un volet |
| Prêts | Reste dû, remboursements reçus, total prêté | Filtres en cours/remboursés ; détail par prêt dépliable ; création dans un volet |
| Bilan | Entrées, consommation, reste après mouvements, éléments à vérifier | Synthèse graphique ; catégories, évolution et prévisions dans des sections distinctes |

La marge des enveloppes est la somme des plafonds configurés moins leur consommation. Les dépenses de catégories sans plafond sont signalées séparément, sans leur inventer un plafond zéro. Les devises ne sont pas additionnées. Les montants inconnus restent explicites.

## Vérifications visuelles

Données fictives dans un environnement de prévisualisation ignoré par Git. Vérification du premier écran à 1366 × 768, des montants à 390 × 844, du volet de configuration et de son arrière-plan inerte, des tableaux et des comptes. À 1366 × 768, les indicateurs et huit lignes du budget tiennent dans le premier écran ; le bilan montre indicateurs, graphique et répartition ensemble. Sur mobile, le patrimoine et le budget passent avant les détails. Les longues listes et formulaires restent défilables ; l’objectif est de voir les informations principales sans défilement, pas de faire tenir tout l’historique sur un écran.

## Références

Les documents officiels de [YNAB sur les objectifs](https://support.ynab.com/how-to-use-targets-rk5kkI9ks) et de [Monarch sur le budget](https://help.monarchmoney.com/hc/en-us/articles/360048883631-Budget) ont servi de points de comparaison pour distinguer pilotage, mouvements, analyses et configuration. La navigation et les composants sont propres à Horizon.
