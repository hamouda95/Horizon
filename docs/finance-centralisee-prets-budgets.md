# Évolution du moteur financier

## Audit et décisions

Avant cette évolution, `entries` constituait déjà le registre des opérations, avec import bancaire, catégories, périodes et rafraîchissement partagé. Les budgets par catégorie étaient exclusivement des plafonds mensuels ponctuels. Les comptes affichaient des instantanés de solde sans lien avec les saisies manuelles. Un remboursement personnel saisi comme opération ordinaire pouvait donc gonfler les revenus. Les calculs de période étaient répétés dans plusieurs composants.

Le modèle conserve les données existantes. Il ajoute les liens nécessaires plutôt qu’un deuxième registre de paiements :

- `entries` est le registre monétaire : catégorie, nature, date, montant, compte et prêt éventuel. Les données bancaires brutes restent la preuve d’import et la base de détection des doublons.
- `finance-engine.ts` utilise `summarizeFlows` et `budgetMonth` pour les totaux de période et catégories. Résumé, enveloppes, notifications et bilan partagent ces règles. Les avances et remboursements de prêts sont séparés des revenus et de la consommation ; ils modifient le reste disponible.
- `financial_accounts`, vue avec `security_invoker`, calcule le solde de chaque compte depuis son solde de clôture, puis les opérations rattachées strictement après ce jour et jusqu’à aujourd’hui. Une opération bancaire est rattachée par sa transaction d’origine ; une saisie manuelle utilise `account_id`. Les deux ne sont jamais additionnés pour une même écriture.
- Sans solde de référence, le solde reste inconnu. Sans compte rattaché, une saisie figure dans les mouvements mais ne modifie aucun solde. Le résumé signale ces limites. Une valorisation de placement reste déclarative, sans cotation automatique.

## Prêts et créances

Le module « Prêts et créances » conserve le nom de l’emprunteur, une créance initiale éventuelle, une date facultative et une note. Les avances et remboursements sont des écritures ordinaires du registre, portant `flow_type='loan'`, `loan_id` et un moyen de paiement. La catégorie « Prêt à un ami » est disponible pour les sorties, et « Remboursement de prêt » pour les entrées.

Une créance antérieure ne produit aucun mouvement fictif. Un remboursement déjà saisi peut être rattaché et reclassé atomiquement, sans nouvelle opération. La date initiale peut rester inconnue. Le solde dû est la créance initiale plus les avances réalisées moins les remboursements réalisés. Les créances encore dues sont distinctes de l’argent disponible.

Le serveur verrouille les prêts concernés, impose le même foyer et refuse un remboursement cumulé supérieur aux sommes prêtées à cette date. Les modifications et suppressions sont soumises aux mêmes contraintes. Une correction qui rendrait une créance incohérente doit être corrigée avec ses opérations liées ; elle n’est pas silencieusement acceptée. L’ouverture initiale est immuable ; le nom et les notes peuvent être gérés sans modifier le principal historique.

## Budgets automatiques

`category_budget_rules` conserve des versions append-only, avec catégorie, date d’effet, montant mensuel ou annuel et numéro de révision. Une configuration vaut pour tous les mois suivants, y compris les années suivantes, sans tâche planifiée ni duplication de lignes. Une nouvelle version change le mois choisi et l’avenir ; aucune configuration rétroactive n’est acceptée.

Le montant annuel est réparti en douze montants entiers de centimes. Les centimes restants sont affectés aux premiers mois de l’année. Les changements en cours d’année produisent un total annuel mixte, sans réécrire les mois précédents. Une année dont certains mois ne sont pas configurés est signalée comme partielle.

Les plafonds mensuels existants restent des dérogations prioritaires. Le formulaire peut reprendre les plafonds d’un mois en un clic ; l’utilisateur valide leur reconduction. Une option explicite peut remplacer aussi les dérogations du mois de prise d’effet. Le budget global prévisionnel historique reste un objectif distinct des enveloppes, et n’est pas réécrit automatiquement.

## Actualisation, historique et analyses

Le chargement partagé contient écritures et prêts. Les mutations relancent ce chargement, puis les soldes et plafonds dépendants. Les tables nouvelles sont incluses dans Realtime. Les soldes sont signalés en cours d’actualisation pendant leur rechargement.

`financial_entry_history` conserve les créations, anciennes/nouvelles valeurs et suppressions depuis l’activation. Les clients peuvent seulement consulter le journal de leur foyer ; l’écriture est effectuée par un déclencheur dont l’exécution directe est révoquée. Les listes d’opérations affichent les cinquante dernières modifications.

Le bilan propose une estimation de fin de mois seulement avec au moins deux mois d’historique, une comparaison au même jour du mois précédent et le repérage de montants inhabituels par catégorie. Il s’agit d’indications issues des saisies, jamais de corrections automatiques ni de prévisions garanties. Les alertes budgétaires, le contrôle des doublons et les objectifs d’épargne existants sont conservés.

## Vérifications

Tests Vitest : prêt distinct des revenus, consommation par catégorie, opérations futures exclues, créances dues, reconduction, versions et dérogations, arrondis annuels, prévision insuffisante et anomalies. Tests SQL fictifs : rattachement d’un remboursement existant, compte mis à jour une seule fois, correction/suppression, solde de clôture sans double comptage, refus de sur-remboursement, historique et isolation entre foyers. Les fixtures sont annulées intégralement. Les formulaires sont vérifiés sur données fictives.
