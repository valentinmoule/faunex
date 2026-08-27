# Faire marcher "Se connecter avec Apple" partout (web + iOS + Android)

## Le problème réel

Apple délivre un jeton d'identité dont le "destinataire" (audience) change selon la plateforme :

| Plateforme | Identifiant Apple utilisé | Audience du jeton |
|---|---|---|
| Web (faunex.fr) | Service ID `com.faunex.web` | `com.faunex.web` |
| iOS natif (feuille Apple système) | App ID `com.faunex.faunex` | `com.faunex.faunex` |
| Android natif | Service ID `com.faunex.web` | `com.faunex.web` |

Le backend d'auth n'accepte aujourd'hui qu'une seule valeur. Quand on met celle du web, iOS est refusé (`Unacceptable audience in id_token: [com.faunex.faunex]`). Quand on met les deux valeurs concaténées dans le champ, c'est le web qui casse (`invalid_client`). C'est pour ça qu'on tourne en rond depuis plusieurs essais.

En plus, sur Android il n'existe pas de feuille Apple système : le plugin ouvre une page web Apple et a besoin d'une URL de retour autorisée côté Apple Developer.

## La solution

Arrêter de faire dépendre les apps natives de ce champ unique, et valider le jeton Apple nous-mêmes côté serveur.

1. **Nouvelle fonction serveur `apple-native-auth`**
   - reçoit le jeton d'identité Apple envoyé par l'app,
   - vérifie sa signature avec les clés publiques officielles d'Apple, l'émetteur, l'expiration et le nonce,
   - accepte les **deux** audiences légitimes (`com.faunex.faunex` pour iOS, `com.faunex.web` pour Android),
   - retrouve ou crée le compte Faunex correspondant à l'e-mail Apple (relais privé Apple géré),
   - renvoie une session valide à l'app.
   Aucun jeton non signé par Apple ne peut passer : la vérification cryptographique est faite côté serveur.

2. **iOS** : on garde la feuille Apple native actuelle, mais l'échange final passe par cette fonction au lieu du backend générique. Le Client ID natif redevient l'App ID `com.faunex.faunex` (ce que la feuille iOS impose de fait).

3. **Android** : on active le flux Apple du plugin avec le Service ID `com.faunex.web` et une URL de retour dédiée `https://faunex.fr/auth/apple-return`, puis même échange via la fonction serveur.

4. **Web** : aucun changement. Le champ Client ID Apple du backend doit rester **`com.faunex.web` seul** (à remettre si ce n'est pas déjà le cas), ce qui garde le web fonctionnel.

## Une action de ta part (Apple Developer)

Pour Android uniquement, dans le Service ID `com.faunex.web` → Sign In with Apple → Configure :
- Domain : `faunex.fr`
- Return URL : ajouter `https://faunex.fr/auth/apple-return` (sans supprimer les URLs existantes)

Rien à changer sur l'App ID, les clés, ni sur iOS.

## Fichiers touchés

- nouveau `supabase/functions/apple-native-auth/index.ts` (vérification JWKS Apple + session)
- `src/lib/nativeAppleSignIn.ts` (client ID par plateforme, échange via la fonction)
- nouvelle page `src/pages/AppleReturnPage.tsx` + route (retour Apple pour Android)
- `src/pages/AuthPage.tsx` (bouton Apple actif sur Android natif)

## Vérification

- typecheck + build
- test de la fonction avec un jeton invalide (doit être refusé) et avec les deux audiences autorisées
- web : parcours Apple inchangé
