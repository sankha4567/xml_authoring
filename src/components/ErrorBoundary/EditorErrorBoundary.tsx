/**
 * EditorErrorBoundary
 *
 * Catches any error thrown during Tiptap editor initialization or rendering.
 * Shows a friendly error panel instead of a blank white screen.
 */

import React from 'react';

interface Props {
  children: React.ReactNode;
  onDismiss?: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

export class EditorErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message ?? 'An unknown editor error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('[EditorErrorBoundary] caught:', error);
  }

  handleDismiss = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onDismiss?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="editor-error-panel">
          <div className="editor-error-icon">⚠</div>
          <h3 className="editor-error-title">Editor failed to load</h3>
          <p className="editor-error-detail">{this.state.message}</p>
          <p className="editor-error-hint">
            This is usually caused by unsupported XML characters in tag names.
            Please check the browser console for details.
          </p>
          <button className="btn btn-primary" onClick={this.handleDismiss}>
            Dismiss &amp; Try Another File
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
