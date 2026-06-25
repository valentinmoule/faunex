## Objectif

Envoyer une notification push PWA à chaque utilisateur qui ne s'est pas connecté depuis **10 jours**, une seule fois (pas de spam si l'inactivité continue), avec un message engageant qui le ramène dans Faunex.

---

## Ce qui sera mis en place

### 1. Infrastructure Web Push (VAPID)

- Génération d'une paire de clés VAPID (publique + privée).
- Clé **publique** exposée côté client (variable d'env).
- Clé **privée** stockée en secret Supabase, utilisée côté edge function pour signer les pushs.

### 2. Service Worker dédié push

- Nouveau fichier `public/push-sw.js` (séparé de tout futur service worker PWA app-shell, pour ne pas casser les previews Lovable).
- Gère les événements `push` (affichage notif avec icône Faunex 🦊, vibration, titre/corps dynamiques) et `notificationclick` (ouvre l'app sur `/home`).

### 3. Table `push_subscriptions`

```
id, user_id (FK profiles), endpoint (unique), p256dh, auth, 
user_agent, created_at, last_used_at
```

- RLS : chaque user gère uniquement ses propres subscriptions.
- GRANTs standards + service_role.

### 4. Onboarding côté client

- **Nouveau composant `PushPermissionPrompt`** : popup discret qui apparaît une fois (après le `PwaInstallBanner`), demandant l'autorisation des notifications avec un wording motivant ("Sois prévenu quand de nouvelles espèces apparaissent près de toi 🦊").
- Si accepté → enregistre le service worker, crée la subscription, l'enregistre en base.
- **Réglage opt-out** dans la page Profil → Paramètres ("Notifications push").

### 5. Edge function `send-inactivity-push` + cron quotidien

- Récupère les utilisateurs avec `last_login_at < now() - 10 days` ET pas de notif inactivité envoyée dans les 30 derniers jours.
- Envoie le push via Web Push API (signé VAPID) à chaque subscription valide.
- Si une subscription renvoie 410 Gone → la supprime de la base.
- Trace dans une nouvelle table `inactivity_notifications_log` (`user_id`, `sent_at`) pour éviter le spam.
- Cron quotidien à 18h00 (heure de pointe d'engagement).

### 6. Tracking `last_login_at`

- Déjà partiellement présent via `login_events`. Ajout d'une colonne `last_login_at` sur `profiles` mise à jour par trigger sur `login_events`, plus performant à requêter quotidiennement.

---

## Limitations à connaître (importantes)

- **iOS Safari** : les notifications push PWA ne fonctionnent que si l'utilisateur a **installé l'app sur son écran d'accueil** (iOS 16.4+). Pas en navigation classique. Ton `PwaInstallBanner` existant prend déjà ça en charge.
- **Android Chrome / Firefox / Edge desktop** : fonctionnent partout, app installée ou non.
- Les notifications n'arrivent que si le navigateur tourne en arrière-plan (cas standard sur mobile).

---

## Variantes possibles (dis-moi si tu préfères)

- **Délai** : 10 jours fixe, ou configurable (ex. à régler depuis le backoffice) ?
- **Fréquence de relance** : une seule fois ? ou une rappel tous les 30 jours s'il ne revient toujours pas ?
- **Wording du push** : générique ("Faunex t'attend 🦊") ou personnalisé ("Reviens chasser de nouvelles espèces !") — je peux aussi varier aléatoirement entre 3-4 messages.
- **Heure d'envoi** : 18h (proposé), 12h ou 9h ?

Tu valides ce plan ? Ou tu veux ajuster un point avant que je code ?