# Plan : Afficher la date de renouvellement des crédits / abonnement

## Objectif
Permettre à l'utilisateur de voir clairement la date exacte de renouvellement (ou de fin d'accès) de son abonnement Premium, directement depuis les paramètres et le profil, sans devoir aller sur la page Premium.

## Contexte actuel
- La date `current_period_end` est déjà récupérée par le hook `useSubscription`.
- Elle est actuellement affichée uniquement dans `src/pages/PremiumPage.tsx`, sous le bouton "Abonnement actif".
- `SettingsPage.tsx` a déjà un item "Faunex Premium" qui redirige vers `/premium`.
- `ProfilePage.tsx` utilise déjà `useSubscription` pour afficher le badge couronne.

## Implémentation prévue

### 1. Composant réutilisable `SubscriptionStatusCard`
Créer `src/components/SubscriptionStatusCard.tsx` qui affiche :
- Badge "Abonnement actif" avec icône `Check`.
- Date de renouvellement formatée en français : "Prochain renouvellement le JJ/MM/AAAA".
- Si `cancel_at_period_end` est vrai : "Accès jusqu'au JJ/MM/AAAA".
- Bouton "Gérer mon abonnement" qui appelle `supabase.functions.invoke('paddle-portal')` comme dans `PremiumPage.tsx`.

### 2. Intégration dans `SettingsPage.tsx`
- Récupérer `subscription` et `isPremium` via `useSubscription(session?.user?.id)`.
- Au-dessus de l'item "Faunex Premium", afficher `SubscriptionStatusCard` quand `isPremium` est vrai.
- Garder l'item "Faunex Premium" existant pour les non-abonnés (upsell).

### 3. Intégration dans `ProfilePage.tsx`
- `useSubscription` est déjà utilisé pour `isPremium`.
- Ajouter `subscription` dans le destructuring.
- Sous le header profil / au-dessus des stats, afficher discrètement `SubscriptionStatusCard` si `isPremium` est vrai.

### 4. Ajustement mineur de `PremiumPage.tsx`
- Remplacer le bloc date + bouton actuel par `SubscriptionStatusCard` pour éviter la duplication et garantir le même wording partout.

## Fichiers concernés
- `src/components/SubscriptionStatusCard.tsx` (création)
- `src/pages/SettingsPage.tsx` (modification)
- `src/pages/ProfilePage.tsx` (modification)
- `src/pages/PremiumPage.tsx` (modification mineure)

## Non-objectifs
- Pas de modification de la base de données ni des Edge Functions.
- Pas de changement du modèle de tarification ou des hooks existants.
