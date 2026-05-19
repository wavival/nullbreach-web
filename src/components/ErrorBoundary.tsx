import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Hook into observability here when wired (Sentry, etc).
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-md">
        <div className="max-w-[480px] w-full rounded border border-border bg-surface-alt p-xl flex flex-col items-center text-center gap-md">
          <div className="size-12 rounded-full bg-error/15 border border-error/40 flex items-center justify-center">
            <AlertTriangle className="size-5 text-error" />
          </div>
          <div>
            <h1 className="font-headline text-h3 text-foreground mb-xs">
              Something went wrong
            </h1>
            <p className="text-body text-foreground-muted">
              The application encountered an unexpected error. Reload the page
              to continue.
            </p>
          </div>
          {import.meta.env.DEV && (
            <pre className="w-full text-left text-body-sm font-mono text-error bg-surface rounded p-sm overflow-auto max-h-[200px]">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center gap-sm h-10 px-lg rounded bg-primary text-primary-foreground font-medium hover:brightness-110 transition-all"
          >
            <RefreshCw className="size-4" />
            Reload
          </button>
        </div>
      </div>
    );
  }
}
