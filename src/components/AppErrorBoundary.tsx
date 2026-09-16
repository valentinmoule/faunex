import React from 'react';
import { isChunkLoadError, recoverFromStaleBuild } from '@/lib/appRecovery';

/**
 * Dernier rempart contre l'écran blanc : si un écran ne parvient pas à se
 * charger (souvent un ancien cache après mise à jour), on tente une
 * récupération automatique, sinon on propose un bouton de rechargement.
 */
interface State {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      void recoverFromStaleBuild();
    } else {
      console.error('[FAUNEX] erreur non rattrapée', error);
    }
  }

  private hardReload = () => {
    void recoverFromStaleBuild().finally(() => window.location.reload());
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="font-display text-lg font-semibold text-foreground">
          Faunex n'a pas réussi à démarrer
        </p>
        <p className="text-sm text-muted-foreground">
          Recharge l'application pour récupérer la dernière version.
        </p>
        <button
          onClick={this.hardReload}
          className="h-11 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          Recharger
        </button>
      </div>
    );
  }
}

export default AppErrorBoundary;
