import UIKit
import Capacitor

/**
 * Cycle de vie « scene » (UIScene), obligatoire à partir d'iOS 27.
 *
 * Apple (Technote TN3187) : une app compilée avec le SDK le plus récent qui
 * n'adopte pas le cycle de vie scene « fail to launch » sur iOS 27 — c'est
 * exactement le symptôme de fermeture immédiate au lancement.
 *
 * L'adoption est compatible depuis iOS 13, donc iOS 15/26 continuent de
 * fonctionner à l'identique. Android et le web ne sont pas concernés.
 *
 * Point sensible : quand une SceneDelegate existe, UIKit n'appelle plus
 * `application(_:open:)` ni `application(_:continue:)` sur l'AppDelegate. Il
 * faut donc relayer manuellement ces événements au proxy Capacitor, sans quoi
 * les retours SSO (fr.faunex.app://auth/callback, Sign in with Apple) et les
 * liens universels ne remontent plus au JS.
 */
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        // La fenêtre et le CAPBridgeViewController sont instanciés par UIKit
        // depuis Main.storyboard (clé UISceneStoryboardFile de l'Info.plist).

        // Démarrage à froid via un deep link (retour SSO).
        if let urlContext = connectionOptions.urlContexts.first {
            forward(url: urlContext)
        }

        // Démarrage à froid via un lien universel / Handoff.
        if let userActivity = connectionOptions.userActivities.first {
            forward(userActivity: userActivity)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let urlContext = URLContexts.first else { return }
        forward(url: urlContext)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        forward(userActivity: userActivity)
    }

    // MARK: - Relais vers Capacitor

    private func forward(url urlContext: UIOpenURLContext) {
        var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
        if let source = urlContext.options.sourceApplication {
            options[.sourceApplication] = source
        }
        if let annotation = urlContext.options.annotation {
            options[.annotation] = annotation
        }
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            open: urlContext.url,
            options: options
        )
    }

    private func forward(userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
        )
    }
}
