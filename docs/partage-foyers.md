# Partage des foyers

## Parcours

Le propriétaire ouvre **Inviter un membre**, peut limiter l'invitation à une adresse e-mail, puis transmet le lien ou son QR code. Les liens expirent après sept jours. Une invitation liée à un e-mail ne peut être acceptée que par un compte correspondant. Un lien sans e-mail peut être accepté par tout compte connecté qui le détient.

Les membres peuvent lire et modifier les opérations, catégories, sous-catégories et budgets mensuels du foyer. Ils ne peuvent pas modifier les paramètres du foyer, gérer les membres ni inviter d'autres comptes. Le propriétaire peut révoquer les invitations non acceptées et retirer un membre. Un compte qui rejoint un foyer conserve également son foyer personnel et peut choisir entre ses foyers accessibles.

## Migrations de production

Les migrations suivantes ont été appliquées sur le projet Supabase Horizon `tjfwlbrtvrapwuaxfirq` :

- `20261027231450_household_sharing`
- `20261027231528_household_sharing_invite_row_fix`
- `20261027231545_household_sharing_invite_conflict_fix`

Elles ajoutent les tables `household_members` et `household_invites`, remplissent les propriétaires existants, activent RLS et exposent des fonctions RPC avec vérifications d'identité et de rôle. Les empreintes de jeton sont stockées à la place des jetons bruts. Le test `supabase/tests/household_sharing.sql` exerce les accès directs et les RPC dans une transaction annulée; il laisse les données de production intactes.

Les quatre fonctions `SECURITY DEFINER` destinées aux RPC sont exécutables uniquement par les utilisateurs authentifiés, ont un `search_path` vide et contrôlent elles-mêmes le propriétaire ou le jeton. Supabase Advisor peut signaler qu'elles sont exécutables par des utilisateurs authentifiés : c'est nécessaire à leur usage via PostgREST et leurs contrôles sont explicites. Le contrôle de protection contre les mots de passe compromis est un avertissement préexistant au projet.

## Retour arrière

Pour retirer le partage, revenir d'abord à une version de l'application qui ne lit pas `household_members`, puis appliquer `supabase/rollback/household_sharing.sql`. Le script supprime les politiques, le déclencheur, les RPC et les deux nouvelles tables; les foyers et leurs données existants restent en place avec les politiques historiques de propriétaire. La restauration ne supprime pas les opérations ni les budgets.
