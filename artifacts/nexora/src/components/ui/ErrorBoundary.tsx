import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props { children: React.ReactNode; fallbackTitle?: string; }
interface State { hasError: boolean; error: Error | null; showDetails: boolean; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Nexora Error:", error, info);
  }

  retry = () => this.setState({ hasError: false, error: null, showDetails: false });

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          showDetails={this.state.showDetails}
          onToggleDetails={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
          onRetry={this.retry}
        />
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({
  error,
  showDetails,
  onToggleDetails,
  onRetry,
}: {
  error: Error | null;
  showDetails: boolean;
  onToggleDetails: () => void;
  onRetry: () => void;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
      style={{ background: "#0A0A0F" }}
    >
      <AlertTriangle className="w-12 h-12 mb-4" style={{ color: "#FF5A5A" }} />
      <h2 className="text-2xl font-bold mb-2" style={{ color: "#F0F0FF" }}>
        Something went wrong
      </h2>
      <p className="mb-6 max-w-sm" style={{ color: "#9090B0" }}>
        An unexpected error occurred. You can try again or go back to the dashboard.
      </p>

      <button
        onClick={onToggleDetails}
        className="text-sm mb-4 underline"
        style={{ color: "#5A5A7A" }}
      >
        {showDetails ? "Hide error details" : "Show error details"}
      </button>

      {showDetails && error && (
        <pre
          className="text-left text-xs mb-6 p-4 rounded-lg max-w-lg w-full overflow-x-auto"
          style={{ background: "#12121A", border: "1px solid #2A2A3E", color: "#9090B0" }}
        >
          {error.message}
        </pre>
      )}

      <div className="flex gap-3">
        <Button onClick={onRetry} className="bg-primary text-white hover:bg-primary/90">
          Try Again
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default ErrorBoundary;
