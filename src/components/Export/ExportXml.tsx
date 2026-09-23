/**
 * Export Component — Download XML button
 *
 * Uses the current DocumentModel from state to produce XML and download it.
 * Flow: DocumentModel → modelToXml() → Blob → Object URL → download
 *
 * No Tiptap logic here.
 */

import React from 'react';
import { modelToXml } from '../../xml/model-to-xml/modelToXml';
import type { DocumentModel } from '../../document-model/types';

interface ExportXmlProps {
  model: DocumentModel | null;
  fileName: string | null;
}

export const ExportXml: React.FC<ExportXmlProps> = ({ model, fileName }) => {
  const handleDownload = () => {
    if (!model) return;

    const xmlString = modelToXml(model);
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
      disabled={!model}
      title={!model ? 'Upload an XML file first' : 'Download as XML'}
    >
      Download XML
    </button>
  );
};
