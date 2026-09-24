/**
 * Export Component — Download XML button
 *
 * Uses the generic astToXml function.
 */

import React from 'react';
import { astToXml } from '../../xml/model-to-xml/modelToXml';
import type { XmlElement } from '../../document-model/GenericAst';

interface ExportXmlProps {
  ast: XmlElement | null;
  fileName: string | null;
}

export const ExportXml: React.FC<ExportXmlProps> = ({ ast, fileName }) => {
  const handleDownload = () => {
    if (!ast) return;

    const xmlString = astToXml(ast);
    const blob = new Blob([xmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName
      ? fileName.replace(/\.xml$/i, '_edited.xml')
      : 'document.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      className="btn btn-secondary"
      onClick={handleDownload}
      disabled={!ast}
      title={!ast ? 'Upload an XML file first' : 'Download as XML'}
    >
      Download XML
    </button>
  );
};
