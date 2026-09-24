/**
 * StatusBar Component
 *
 * VSCode-style bottom status bar showing file name, node count, and tag types.
 */

import React from 'react';
import type { XmlElement } from '../../document-model/GenericAst';
import type { SanitizedTag } from '../../editor/schema/SchemaSanitizer';
import { countNodes } from '../DocumentTree/DocumentTree';

interface StatusBarProps {
  ast: XmlElement | null;
  fileName: string | null;
  schema: SanitizedTag[] | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ ast, fileName, schema }) => {
  const nodeCount = ast ? countNodes(ast) : 0;
  const tagCount = schema ? schema.length : 0;

  return (
    <footer className="status-bar">
      {fileName ? (
        <>
          <span className="status-item status-item--file">
            <span className="status-icon">📄</span>
            {fileName}
          </span>
          <span className="status-sep">›</span>
          <span className="status-item">{nodeCount} nodes</span>
          <span className="status-sep">›</span>
          <span className="status-item">{tagCount} tag types</span>
          <span className="status-spacer" />
          <span className="status-item status-item--ready">● Ready</span>
        </>
      ) : (
        <>
          <span className="status-spacer" />
          <span className="status-item status-item--idle">No file loaded — Upload XML to start</span>
          <span className="status-spacer" />
        </>
      )}
    </footer>
  );
};
