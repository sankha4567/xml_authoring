/**
 * Application State
 *
 * Simple React state management — no Redux, no Zustand.
 */

import { useState, useCallback } from 'react';
import type { DocumentModel } from '../document-model/types';

export type ValidationState = 'idle' | 'valid' | 'error';

export interface AppState {
  currentDocumentModel: DocumentModel | null;
  fileName: string | null;
  validationState: ValidationState;
  errorMessages: string[];
  editorReady: boolean;
}

export interface AppActions {
  setDocumentModel: (model: DocumentModel, fileName: string) => void;
  setValidationError: (messages: string[]) => void;
  setEditorReady: (ready: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: AppState = {
  currentDocumentModel: null,
  fileName: null,
  validationState: 'idle',
  errorMessages: [],
  editorReady: false,
};

export function useDocumentState(): [AppState, AppActions] {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  const setDocumentModel = useCallback(
    (model: DocumentModel, fileName: string) => {
      setState({
        currentDocumentModel: model,
        fileName,
        validationState: 'valid',
        errorMessages: [],
        editorReady: true,
      });
    },
    []
  );

  const setValidationError = useCallback((messages: string[]) => {
    setState((prev) => ({
      ...prev,
      validationState: 'error',
      errorMessages: messages,
      editorReady: false,
    }));
  }, []);

  const setEditorReady = useCallback((ready: boolean) => {
    setState((prev) => ({ ...prev, editorReady: ready }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const actions: AppActions = {
    setDocumentModel,
    setValidationError,
    setEditorReady,
    reset,
  };

  return [state, actions];
}
