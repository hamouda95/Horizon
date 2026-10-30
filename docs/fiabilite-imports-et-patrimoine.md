# Imports fiables, patrimoine et budgets par catégorie

## Doublons

Les anciens imports utilisaient parfois la référence OFX et parfois une empreinte QIF. Une même opération pouvait donc être ajoutée deux fois. Le serveur compare maintenant la date, le montant signé, la devise et le libellé normalisé indépendamment du format et de la référence fournisseur. Un rang d’occurrence distingue plusieurs opérations identiques dans un même relevé. La protection est sérialisée par propriétaire pour les imports concurrents.

La détection concerne les comptes d’un même utilisateur. Une dérogation explicite permet une opération identique sur deux comptes distincts. Sur un même compte, une copie est bloquée. Deux paiements identiques dans des exports partiels restent ambigus : vérifier les occurrences proposées dans l’aperçu.

Dans **Comptes et avoirs → Doublons à vérifier**, choisir les groupes et la ligne à conserver, puis confirmer. La catégorie et sous-catégorie de cette ligne sont préservées. Les références des copies sont conservées comme alias. La réparation retire les écritures redondantes du budget et ne touche pas aux soldes. Des rapprochements de factures contradictoires bloquent la réparation. Aucun nettoyage automatique des anciens imports n’est effectué.

## Référentiel de catégorisation

Le dictionnaire initial est dans `render-app/classification-reference.ts` : supermarchés, alimentation, loyers entrants/sortants, salaires, aides, énergie, télécoms, assurances, transports, santé, abonnements, impôts, remboursements, revenus de placements. Les mots sont recherchés dans le libellé complet et les indications de catégorie du relevé. La phrase la plus précise est prioritaire. Une règle du foyer confirmée prévaut sur ce dictionnaire.

Dans **Comptes et avoirs → Dictionnaire de catégorisation**, consulter le référentiel, compléter les catégories et sous-catégories manquantes puis ajouter ou modifier une correspondance du foyer. Les catégories archivées ne sont pas réactivées. Les opérations anciennes sont corrigées dans la revue de catégorisation après sélection ; une nouvelle règle ne réécrit pas silencieusement leur historique. Toute proposition reste à vérifier.

## Chiffres de la vue d’ensemble

- Les avoirs proviennent des soldes/valeurs saisis ou relevés : courant, épargne, espèces, placements et autres avoirs. Chaque devise est totalisée séparément. Les crédits sont exclus des avoirs et présentés dans la situation nette.
- Un solde inconnu reste inconnu. Le total est marqué incomplet, ou non renseigné si aucun solde n’est connu. L’historique d’opérations, éventuellement partiel, ne remplace pas un solde d’ouverture. Les dates des soldes restent consultables dans le détail des comptes.
- Les dépenses du mois correspondent aux opérations confirmées réalisées à la date du jour. Transferts, épargne, placements et opérations à vérifier sont exclus. Les remboursements sont séparés et ne diminuent pas automatiquement une enveloppe sans rattachement métier fiable.
- Sans plafond de catégorie, aucun taux de consommation n’est inventé. Avec plafond : moins de 50 % vert, 50 à moins de 70 % orange, 70 à moins de 90 % vert clair, dès 90 % rouge. Un plafond zéro avec dépense est en alerte ; zéro dépensé sur zéro donne 0 %.
- La cloche en haut affiche les catégories à au moins 90 % pour le mois courant. L’état lu est valable pour la session de l’application. Aucun envoi d’e-mail n’est activé.
- Les doublons historiques encore présents déclenchent un avertissement : les revenus et dépenses peuvent rester surévalués tant que leur revue n’est pas validée.

## Validation

Tests de régression : OFX/QIF, occurrences identiques, contrôles serveur et isolation utilisateur, dérogation entre comptes, réparation choisie sans modification des soldes, dictionnaire, seuils, devises et soldes inconnus. Les fixtures SQL sont fictives et exécutées dans une transaction annulée.
