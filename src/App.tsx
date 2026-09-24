/**
 * App — Root component
 * VSCode-style layout: header | sidebar + editor panel | status bar
 */

import React, { useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useDocumentState } from './state/useDocumentState';
import { modelToTiptap } from './editor/model-to-tiptap/modelToTiptap';
import { FileUpload } from './components/FileUpload/FileUpload';
import { ExportXml } from './components/Export/ExportXml';
import { ValidationError } from './components/ValidationError/ValidationError';
import { XmlEditor } from './components/Editor/XmlEditor';
import { EditorErrorBoundary } from './components/ErrorBoundary/EditorErrorBoundary';
import { DocumentTree } from './components/DocumentTree/DocumentTree';
import { StatusBar } from './components/StatusBar/StatusBar';
import { useSidebarResize } from './hooks/useSidebarResize';
import type { XmlElement } from './document-model/GenericAst';
import type { SanitizedTag } from './editor/schema/SchemaSanitizer';

export const App: React.FC = () => {
  const [state, actions] = useDocumentState();
  const [tiptapContent, setTiptapContent] = useState<JSONContent | null>(null);
  const { width, collapsed, toggle, onMouseDown } = useSidebarResize();

  const handleUploadSuccess = (
    ast: XmlElement,
    schema: SanitizedTag[],
    tagToPm: Map<string, string>,
    pmToTag: Map<string, string>,
    fileName: string
  ) => {
    const tiptapJson = modelToTiptap(ast, tagToPm);
    setTiptapContent(tiptapJson);
    actions.setDocumentData(ast, schema, tagToPm, pmToTag, fileName);
  };

  const handleUploadError = (messages: string[]) => actions.setValidationError(messages);
  const handleAstChange = (ast: XmlElement) => actions.updateDocumentAst(ast);
  const handleDismissError = () => actions.reset();
  const handleEditorCrash = () => actions.reset();

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header-brand">
          {/* Sidebar toggle button */}
          <button
            className="sidebar-toggle-btn"
            onClick={toggle}
            title={collapsed ? 'Show Explorer (Ctrl+B)' : 'Hide Explorer (Ctrl+B)'}
            aria-label="Toggle sidebar"
          >
            {collapsed ? '⟩' : '⟨'}
          </button>
          <span className="app-logo">✦</span>
          <div>
            <h1 className="app-title">XML Author</h1>
            <p className="app-subtitle">Dynamic XML Authoring Engine</p>
          </div>
        </div>
        <div className="app-header-actions">
          <FileUpload onSuccess={handleUploadSuccess} onError={handleUploadError} />
          <ExportXml ast={state.currentDocumentAst} fileName={state.fileName} />
        </div>
      </header>

      {/* ── Body: sidebar + editor ── */}
      <div className="app-body">

        {/* Left Sidebar */}
        {!collapsed && (
          <>
            <aside
              className="sidebar"
              style={{ width: `${width}px` }}
              aria-label="Document Explorer"
            >
              {/* Sidebar Header */}
              <div className="sidebar-header">
                <span>EXPLORER</span>
                {state.fileName && (
                  <span className="sidebar-filename">{state.fileName}</span>
                )}
              </div>

              {/* Document Tree */}
              <div className="sidebar-content">
                {state.validationState === 'error' ? (
                  <div className="tree-empty tree-empty--error">
                    <span>⚠ Parse error</span>
                  </div>
                ) : (
                  <DocumentTree ast={state.currentDocumentAst} />
                )}
              </div>

              {/* Schema info footer */}
              {state.discoveredSchema && (
                <div className="sidebar-footer">
                  <span className="sidebar-schema-label">
                    {state.discoveredSchema.length} tag types discovered
                  </span>
                </div>
              )}
            </aside>

            {/* Drag resize handle */}
            <div
              className="sidebar-resize-handle"
              onMouseDown={onMouseDown}
              title="Drag to resize"
              aria-hidden
            />
          </>
        )}

        {/* Right Editor Panel */}
        <main className="editor-panel">
          {state.validationState === 'error' && (
            <ValidationError messages={state.errorMessages} onDismiss={handleDismissError} />
          )}

          {state.editorReady && tiptapContent && state.discoveredSchema && state.pmToTag ? (
            <EditorErrorBoundary onDismiss={handleEditorCrash}>
              <XmlEditor
                key={state.fileName}
                initialContent={tiptapContent}
                schema={state.discoveredSchema}
                pmToTag={state.pmToTag}
                onModelChange={handleAstChange}
              />
            </EditorErrorBoundary>
          ) : state.validationState === 'idle' ? (
            <div className="empty-state">
              <div className="empty-state-icon">📂</div>
              <h2>No document loaded</h2>
              <p>Upload any XML file to begin authoring.</p>
              <p className="empty-state-hint">
                Any tag names · Any nesting depth · Any structure
              </p>
            </div>
          ) : null}
        </main>
      </div>

      {/* ── Status Bar ── */}
      <StatusBar
        ast={state.currentDocumentAst}
        fileName={state.fileName}
        schema={state.discoveredSchema}
      />
    </div>
  );
};
