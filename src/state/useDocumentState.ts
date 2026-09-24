/**
 * Application State
 *
 * Holds the Generic AST, discovered + sanitized schema, bidirectional tag maps,
 * and editor readiness state.
 */

import { useState, useCallback } from 'react';
import type { XmlElement } from '../document-model/GenericAst';
import type { SanitizedTag } from '../editor/schema/SchemaSanitizer';

export type ValidationState = 'idle' | 'valid' | 'error';

export interface AppState {
  currentDocumentAst: XmlElement | null;
  discoveredSchema: SanitizedTag[] | null;
  tagToPm: Map<string, string> | null;    // xmlTag  → pmName
  pmToTag: Map<string, string> | null;    // pmName  → xmlTag
  fileName: string | null;
  validationState: ValidationState;
  errorMessages: string[];
  editorReady: boolean;
}

export interface AppActions {
  setDocumentData: (
    ast: XmlElement,
    schema: SanitizedTag[],
    tagToPm: Map<string, string>,
    pmToTag: Map<string, string>,
    fileName: string
  ) => void;
  updateDocumentAst: (ast: XmlElement) => void;
  setValidationError: (messages: string[]) => void;
  reset: () => void;
}

const INITIAL_STATE: AppState = {
  currentDocumentAst: null,
  discoveredSchema: null,
  tagToPm: null,
  pmToTag: null,
  fileName: null,
  validationState: 'idle',
  errorMessages: [],
  editorReady: false,
};

export function useDocumentState(): [AppState, AppActions] {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  const setDocumentData = useCallback(
    (
      ast: XmlElement,
      schema: SanitizedTag[],
      tagToPm: Map<string, string>,
      pmToTag: Map<string, string>,
      fileName: string
    ) => {
      setState({
        currentDocumentAst: ast,
        discoveredSchema: schema,
        tagToPm,
        pmToTag,
        fileName,
        validationState: 'valid',
        errorMessages: [],
        editorReady: true,
      });
    },
    []
  );

  const updateDocumentAst = useCallback((ast: XmlElement) => {
    setState(prev => ({ ...prev, currentDocumentAst: ast }));
  }, []);

  const setValidationError = useCallback((messages: string[]) => {
    setState(prev => ({
      ...prev,
      validationState: 'error',
      errorMessages: messages,
      editorReady: false,
    }));
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return [state, { setDocumentData, updateDocumentAst, setValidationError, reset }];
}
