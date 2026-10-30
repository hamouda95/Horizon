# Module Vue d’ensemble et corrections des imports

## Résumé compact

La Vue d’ensemble affiche deux blocs :

1. **Budget du mois** : revenus confirmés, dépenses confirmées, plafond et budget restant. Sans plafond, le troisième indicateur devient l’équilibre après remboursements et épargne nette. Les opérations incertaines sont signalées et accessibles pour correction.
2. **Total par compte** : un solde daté pour chaque fiche, regroupée par type. Aucun solde inconnu n’est remplacé par zéro. Aucun total d’épargne additionnant des fiches potentiellement dupliquées n’est présenté.

Les historiques, graphiques détaillés et conseils ne sont plus dans cette page. Ils restent accessibles par leurs modules. Le résumé a été contrôlé avec des données fictives, cinq comptes et un viewport mobile de 390 × 844, ainsi que sur ordinateur. Un grand nombre de comptes ou un écran plus petit peut naturellement nécessiter de défiler.

## Revenus et catégorisation

Les revenus « À vérifier » restent exclus des totaux confirmés, mais sont désormais affichés dans Revenus pour pouvoir être corrigés. L’historique bancaire permet aussi d’ouvrir directement la correction d’une opération, y compris un transfert mal reconnu.

Une correction explicite d’opération mémorise une règle de contrepartie propre au foyer : catégorie, sous-catégorie et nature du flux. Aucune liste d’employeurs propre à un client n’est codée dans l’application. Les catégories génériques des anciens imports (« Autres… ») ne servent plus d’exemples d’apprentissage. Les règles confirmées priment ; les règles lexicales courantes aident ensuite à suggérer les commerces et types de dépenses connus.

Le module Banque propose une revue des anciennes catégories, avec sélection des suggestions à appliquer. Les corrections ne modifient pas les montants ou dates. Les textes de remboursement bancaires commençant par « AVOIR » sont reconnus.

## Contrôle des imports et pouvoir de correction

- Le vérificateur compare les fingerprints des opérations déjà visibles appartenant **au même propriétaire de compte**, sur ses différents comptes, et pas seulement sur la fiche de destination. Les opérations d’autres utilisateurs ne sont pas mélangées.
- Le serveur applique aussi ce contrôle, avec un verrou par propriétaire afin de sérialiser les imports concurrents. Les lignes déjà importées sur une autre fiche sont comptées comme doublons et n’ajoutent pas de dépense au bilan.
- Un utilisateur peut explicitement autoriser des opérations identiques sur des comptes réellement distincts. Une ligne simplement semblable à une autre dans le même fichier peut être réincluse après vérification. Le doublon strict sur le même compte reste idempotent.
- Le compte de destination est choisi ou la création d’une nouvelle fiche est demandée explicitement. Une correspondance par contenu peut retrouver un compte même si le nom du fichier a changé ; une correspondance ambiguë impose le choix de l’utilisateur.
- Un relevé ancien ne remplace plus un cliché de solde plus récent.

Le fingerprint est une identité calculée depuis l’export, pas un identifiant bancaire universel. Deux formats dont les libellés/références divergent peuvent nécessiter une vérification manuelle. Aucune contrainte globale sur tous les foyers ne supprime arbitrairement des opérations.

## Gestion des comptes

Le propriétaire d’un compte manuel peut modifier son nom, sa source, son type et la personne titulaire. Les identités d’accès, le fournisseur et le foyer ne deviennent pas modifiables par le navigateur.

Deux fiches représentant le même compte réel peuvent être fusionnées **à la demande de l’utilisateur et après confirmation** :

- même propriétaire, même foyer, même devise et même type exigés ;
- opérations uniques déplacées et doublons stricts retirés en une transaction ;
- classification du compte destination conservée pour les doublons ;
- solde le plus récent retenu, jamais additionné ;
- liens d’échéances préservés ; fusion refusée si les deux doublons règlent des échéances distinctes ou si un lien ne peut être conservé correctement ;
- fiche source supprimée seulement après transfert réussi.

Les fiches existantes suspectées d’être des réimports ne sont pas fusionnées automatiquement.

## Vérification et déploiement

Migration : `20261030101845_account_management_and_user_deduplication.sql`, à appliquer avant le frontend qui gère les comptes. Tests SQL : `supabase/tests/account_management.sql`, utilisant des utilisateurs fictifs et un `ROLLBACK` complet, vérifiés avant et après migration. Ils couvrent la modification autorisée, le contrôle inter-comptes, la dérogation explicite, l’interdiction de fusion par un tiers et la conservation des opérations et du dernier solde.

Les tests de rendu, de classification et de dédoublonnage utilisent exclusivement des données fictives. Les données du cas utilisateur ont été examinées dans Supabase sans être copiées dans le dépôt public.
