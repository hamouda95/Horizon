# Virements internes, édition des plafonds et rédaction

## Deux comptes, aucun nouveau revenu

Les transactions des relevés restent la preuve bancaire : date, montant signé, devise, libellé d’origine et référence ne sont pas modifiés. Le rapprochement recherche deux écritures de signes opposés, du même montant, de la même devise et du même jour, sur deux comptes distincts du même titulaire dans le même foyer. Les deux relevés doivent aussi fournir un indice de mouvement interne. Un simple montant identique ne suffit pas.

Quand le rapprochement est unique des deux côtés, les deux écritures deviennent des transferts internes. Elles restent visibles dans chaque compte, mais ne constituent ni revenu courant ni consommation et ne modifient pas le reste global du foyer. Les mouvements bruts de compte sont présentés séparément des revenus et de la consommation.

Exemple fictif : deux versements de 2 000 € du compte courant vers l’épargne, puis un retour de 4 000 €, produisent six écritures de compte. Les soldes reviennent à leur état initial, les revenus et la consommation restent nuls, et le patrimoine total est inchangé. Aucun mouvement supplémentaire n’est inventé.

Le rapprochement fonctionne à l’arrivée des écritures et lors de leurs corrections, dans la même transaction. Il respecte l’accès au foyer et ne rapproche jamais les comptes de titulaires distincts. Les cas ambigus, les dates décalées et les écritures dont le montant ou la date ont été corrigés ne sont pas automatiquement appariés. Une indication explicite de transfert interne prévaut sur une ancienne suggestion de classement à l’import.

## Plafond accessible depuis la catégorie

Un crayon précède chaque catégorie dans le Budget et dans le résumé des catégories. Le volet ouvre le plafond mensuel de la période choisie. L’utilisateur peut modifier uniquement ce mois ou enregistrer une nouvelle configuration récurrente à partir de ce mois. Les autres dérogations mensuelles restent prioritaires ; les opérations bancaires ne changent pas. En vue annuelle, le volet précise le mois modifié.

## Règle rédactionnelle

Les textes d’interface n’utilisent plus de capitales forcées. Les libellés, catégories et noms affichés passent par une présentation commune, sans changer les valeurs utilisées pour les rapprochements ni les identifiants. Les abréviations bancaires courantes sont développées à l’affichage. Les valeurs des listes restent celles des données d’origine.

Les intitulés, accords au singulier/pluriel, messages de confirmation et libellés accessibles ont été relus. Les formes de type « opération(s) » sont remplacées par un accord correspondant au nombre. Les codes techniques nécessaires aux formats et aux données restent dans le code, sans imposer leur casse à l’interface.

## Vérifications

Tests financiers : aller-retour entre courant et épargne sans revenu ni consommation ; somme des soldes inchangée ; rapprochement automatique et idempotent ; refus d’un rapprochement fondé seulement sur un montant identique ; isolation entre foyers. Les fixtures de base sont fictives et annulées intégralement.

Tests d’interface : édition du plafond, conservation des libellés originaux et présentation sans mots entièrement en majuscules, accords grammaticaux, et rendu du module Prêts une seule fois. Le fil d’Ariane affiche uniquement le nom de page ; il ne monte aucun module.
