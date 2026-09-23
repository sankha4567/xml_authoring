/**
 * FileUpload Component
 *
 * Handles XML file selection and drives the full upload pipeline:
 * File → parse → validate → xmlToModel → setDocumentModel
 *
 * No XML parsing or business logic directly here —
 * it delegates to the xml/ layer functions.
 */

import React, { useRef } from 'react';
import { parseXml } from '../../xml/parser/parseXml';
import { validateXml } from '../../xml/validation/validateXml';
import { xmlToModel } from '../../xml/xml-to-model/xmlToModel';
import type { DocumentModel } from '../../document-model/types';

interface FileUploadProps {
  onSuccess: (model: DocumentModel, fileName: string) => void;
  onError: (messages: string[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onSuccess,
  onError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-uploaded
    e.target.value = '';

    let xmlText: string;
    try {
      xmlText = await file.text();
    } catch {
      onError(['Failed to read file.']);
      return;
    }

    // 1. Parse XML
    const parseResult = parseXml(xmlText);
    if (!parseResult.ok) {
      onError([parseResult.message]);
      return;
    }

    // 2. Validate structure
    const validationResult = validateXml(parseResult.nodes);
    if (!validationResult.valid) {
      onError(validationResult.errors);
      return;
    }

    // 3. Convert to Internal Document Model
    let model: DocumentModel;
    try {
      model = xmlToModel(parseResult.nodes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onError([`Model conversion error: ${msg}`]);
      return;
    }

    onSuccess(model, file.name);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button className="btn btn-primary" onClick={handleClick}>
        Upload XML
      </button>
    </>
  );
};
