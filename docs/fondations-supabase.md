# Fondations Supabase — proposition de travail

Statut : un premier schéma à propriétaire unique a été appliqué au projet Supabase ; les membres et invitations ci-dessous restent une proposition. La copie du SQL appliqué figure dans database/applied. L'application n'est pas encore raccordée à Supabase.

## Périmètre initial

Conserver l'expérience Horizon (catégories, opérations et bilan mensuel) et remplacer progressivement l'identité et le stockage spécifiques à Sites par Supabase Auth et Postgres. Les montants sont stockés en centimes entiers et la devise en code ISO 4217 ; aucune clé privilégiée dans le navigateur ou le dépôt. Les données de l'ancien site restent dans sa base actuelle tant qu'une migration et une vérification ne sont pas réalisées.

## Modèle proposé

| Entité | Champs essentiels | Rôle |
| --- | --- | --- |
| Foyer | id UUID, nom, devise, date de création | Regroupe le budget partagé. |
| Membre | foyer_id, user_id de auth.users, rôle, date d'adhésion | Autorise l'accès au foyer. Contrainte unique sur (foyer_id, user_id). |
| Catégorie | id, foyer_id, type revenu/dépense, nom, état actif | Personnalise la saisie ; conserver les catégories utilisées pour l'historique. |
| Opération | id, foyer_id, catégorie_id, libellé, type, montant_centimes, date, created_by | Enregistre un revenu ou une dépense. Montant strictement positif. |
| Invitation (étape ultérieure) | id, foyer_id, rôle, échéance, statut, empreinte du jeton | Permet à un membre d'inviter une personne ; le jeton brut ne doit pas être stocké. |

Ajouter une clé étrangère composite permettant de garantir qu'une opération et sa catégorie appartiennent au même foyer. Indexer les opérations par (foyer_id, date) et les adhésions par (user_id, foyer_id). Utiliser des contraintes de longueur et des types explicites. Les crédits, prêts, investissements et fiches de paie seront modélisés séparément lors de leur implémentation.

## Identité et autorisation

- Supabase Auth gère l'identité ; les données d'identité modifiables par l'utilisateur ne déterminent jamais les autorisations.
- Activer RLS sur toutes les tables exposées, révoquer les droits superflus et accorder explicitement aux rôles nécessaires les accès à la Data API. L'accès à une ligne dépend d'une adhésion active au foyer.
- Pour chaque écriture, vérifier le foyer et la catégorie, ainsi que les rôles autorisés. Empêcher la réaffectation d'une opération vers un autre foyer par les clauses WITH CHECK.
- La création du foyer et de son adhésion initiale doit être atomique. Concevoir la fonction correspondante avec des privilèges minimaux et tester les accès directs, notamment les fonctions exécutables. La gestion des invitations et des rôles ne doit jamais permettre à une personne de s'ajouter elle-même à un foyer arbitraire.
- Éviter les politiques récursives entre foyer et membres ; choisir et tester une stratégie explicite avant toute migration. Si une fonction privilégiée est nécessaire, l'isoler dans un schéma non exposé, limiter ses permissions et auditer son contenu.
- Les décisions de partage, invitations et changements de rôle nécessitent des tests distincts ; ne pas activer l'accès multiutilisateur avant ces tests.

## Livraison par étapes

1. Accès et inspection initiale du projet : effectués. Examiner les alertes existantes du conseiller de sécurité avant mise en production.
2. Premier schéma appliqué au projet cible : GRANT et RLS en place, isolation vérifiée sur deux identités dans une transaction annulée. Intégrer son historique au flux Supabase CLI et valider les futures migrations dans un environnement isolé.
3. Brancher une authentification Supabase et porter la saisie et le bilan dans une branche de travail ; conserver le site actuel intact.
4. Tester avec deux comptes et deux foyers : lecture, création, modification, suppression et tentatives de changement de foyer, y compris requêtes directes à l'API.
5. Tester la migration des données existantes si souhaitée ; identifier les utilisateurs et comparer les totaux avant bascule. Ne pas effacer l'ancienne base avant validation.
6. Mettre en place une stratégie de sauvegarde et de restauration vérifiée avant d'accueillir des données réelles.

## Hors périmètre initial

Paiement, essai 14 jours, liaison bancaire, IA et applications mobiles. Le mode invité doit avoir sa propre durée de vie et une méthode explicite de récupération ou de suppression des données ; il ne faut pas l'assimiler automatiquement à un compte enregistré.
