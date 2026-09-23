/**
 * ValidationError Component
 *
 * Displays structured validation error messages.
 */

import React from 'react';

interface ValidationErrorProps {
  messages: string[];
  onDismiss?: () => void;
}

export const ValidationError: React.FC<ValidationErrorProps> = ({
  messages,
  onDismiss,
}) => {
  if (messages.length === 0) return null;

  return (
    <div className="validation-error-panel" role="alert">
      <div className="validation-error-header">
        <span className="validation-error-icon">⚠</span>
        <strong>Document Error</strong>
        {onDismiss && (
          <button
            className="validation-error-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
      <ul className="validation-error-list">
        {messages.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </div>
  );
};
