/**
 * App — Root component
 *
 * Layout only. All business logic delegated to hooks and xml/ layer.
 * No XML parsing or serialization here.
 */

import React, { useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useDocumentState } from './state/useDocumentState';
import { modelToTiptap } from './editor/model-to-tiptap/modelToTiptap';
import { FileUpload } from './components/FileUpload/FileUpload';
import { ExportXml } from './components/Export/ExportXml';
import { ValidationError } from './components/ValidationError/ValidationError';
import { XmlEditor } from './components/Editor/XmlEditor';
import type { DocumentModel } from './document-model/types';

export const App: React.FC = () => {
  const [state, actions] = useDocumentState();
  const [tiptapContent, setTiptapContent] = useState<JSONContent | null>(null);

  const handleUploadSuccess = (model: DocumentModel, fileName: string) => {
    const tiptapJson = modelToTiptap(model);
    setTiptapContent(tiptapJson);
    actions.setDocumentModel(model, fileName);
  };

  const handleUploadError = (messages: string[]) => {
    actions.setValidationError(messages);
  };

  const handleModelChange = (model: DocumentModel) => {
    // Update canonical model on every Tiptap edit
    if (state.fileName) {
      actions.setDocumentModel(model, state.fileName);
    }
  };

  const handleDismissError = () => {
    actions.reset();
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-brand">
          <span className="app-logo">✦</span>
          <div>
            <h1 className="app-title">XML Author</h1>
            <p className="app-subtitle">XML → Model → Tiptap → Model → XML</p>
          </div>
        </div>

        <div className="app-header-actions">
          <FileUpload
            onSuccess={handleUploadSuccess}
            onError={handleUploadError}
          />
          <ExportXml
            model={state.currentDocumentModel}
            fileName={state.fileName}
          />
        </div>
      </header>

      {/* File info strip */}
      {state.fileName && state.validationState === 'valid' && (
        <div className="file-info-bar">
          <span className="file-info-icon">📄</span>
          <span className="file-info-name">{state.fileName}</span>
          <span className="file-info-badge">Ready</span>
        </div>
      )}

      {/* Main content */}
      <main className="app-main">
        {/* Validation errors */}
        {state.validationState === 'error' && (
          <ValidationError
            messages={state.errorMessages}
            onDismiss={handleDismissError}
          />
        )}

        {/* Editor */}
        {state.editorReady && tiptapContent ? (
          <XmlEditor
            initialContent={tiptapContent}
            onModelChange={handleModelChange}
          />
        ) : state.validationState === 'idle' ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <h2>No document loaded</h2>
            <p>Upload an XML file to begin authoring.</p>
            <p className="empty-state-hint">
              Supported elements: <code>article</code>, <code>section</code>,{' '}
              <code>paragraph</code>, <code>heading</code>,{' '}
              <code>bullet-list</code>, <code>ordered-list</code>,{' '}
              <code>bold</code>, <code>italic</code>, <code>underline</code>,{' '}
              <code>link</code>
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
};
