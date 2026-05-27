import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label ?? "App"}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="m-6 max-w-lg rounded-xl border border-rose-500/40 bg-rose-500/10 p-5 text-sm text-rose-100">
          <h2 className="mb-2 text-base font-semibold">Screen failed to load</h2>
          <p className="mb-3 font-mono text-[12px] text-rose-200/90">{this.state.error.message}</p>
          <p className="text-[11px] text-[var(--muted)]">
            Try <code className="text-indigo-300">pnpm run dev</code> in Tool/P0020-Data-Box, then hard refresh (Ctrl+Shift+R).
          </p>
          <button
            type="button"
            className="btn mt-4 text-[12px]"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
