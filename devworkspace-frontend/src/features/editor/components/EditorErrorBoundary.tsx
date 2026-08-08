import { Component, type ReactNode } from "react";
import { lab } from "../styles/tokens";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
  resetToken: number;
}

/**
 * Catches any runtime error in the editor and shows a recoverable screen
 * instead of a silent white/blank page. "Reset editor" remounts the subtree.
 */
export default class EditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetToken: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Left in place so crashes stay diagnosable later.
    // eslint-disable-next-line no-console
    console.error("[EditorErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: lab.bgDeep,
            color: lab.text,
          }}
        >
          <div style={{ width: 420, maxWidth: "90%" }}>
            <div
              style={{
                fontSize: 13,
                fontFamily: lab.monospace,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: lab.red,
                marginBottom: 8,
              }}
            >
              Editor error
            </div>
            <div
              style={{
                fontSize: 11,
                color: lab.textMuted,
                fontFamily: lab.monospace,
                lineHeight: 1.6,
                marginBottom: 16,
                whiteSpace: "pre-wrap",
              }}
            >
              {this.state.error.message || String(this.state.error)}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() =>
                  this.setState((s) => ({
                    error: null,
                    resetToken: s.resetToken + 1,
                  }))
                }
                style={{
                  border: `1px solid ${lab.amber}`,
                  background: `${lab.amber}18`,
                  color: lab.amber,
                  borderRadius: 4,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: lab.monospace,
                }}
              >
                Reset editor
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  border: `1px solid ${lab.borderStrong}`,
                  background: "transparent",
                  color: lab.textMuted,
                  borderRadius: 4,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: lab.monospace,
                }}
              >
                Reload app
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div key={this.state.resetToken} style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {this.props.children}
      </div>
    );
  }
}