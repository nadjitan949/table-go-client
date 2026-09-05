// ErrorBoundary.tsx
import React, { Component } from "react";
import type { ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Erreur capturée :", error, info);
    alert(`Erreur capturée : ${error}, ${info}`);
  }

  render() {
    if (this.state.hasError) {
      return <div>Une erreur est survenue.</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;