import React from "react";

type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[App Error]", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen flex items-center justify-center bg-smoke px-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-display text-navy">Une erreur est survenue</h1>
          <p className="mt-3 text-gray-600">
            Veuillez recharger la page. Si le probleme persiste, contactez Thunderfam.
          </p>
          <button
            type="button"
            className="mt-6 px-5 py-3 rounded-lg bg-navy text-white font-semibold"
            onClick={() => window.location.reload()}
          >
            Recharger
          </button>
        </div>
      </main>
    );
  }
}
