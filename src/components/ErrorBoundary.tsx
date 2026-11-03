import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** 예기치 못한 오류로 화면이 비지 않도록, 안내와 새로고침 버튼을 보여 줍니다. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("화면 오류", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal" role="alert">
        <h1>화면을 표시하지 못했습니다</h1>
        <p>페이지를 새로 고친 뒤 다시 점검해 주세요. 문제가 계속되면 크롬을 다시 열어 보세요.</p>
        <pre className="mono">{this.state.error.message}</pre>
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>새로 고침</button>
      </main>
    );
  }
}
