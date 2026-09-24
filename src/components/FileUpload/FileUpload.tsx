/**
 * FileUpload Component
 *
 * Pipeline: File → parseXml → xmlToAst → SchemaDiscoverer → sanitizeSchema → onSuccess
 */

import React, { useRef } from 'react';
import { parseXml } from '../../xml/parser/parseXml';
import { xmlToAst } from '../../xml/xml-to-model/xmlToModel';
import { SchemaDiscoverer } from '../../editor/schema/SchemaDiscoverer';
import { sanitizeSchema } from '../../editor/schema/SchemaSanitizer';
import type { XmlElement } from '../../document-model/GenericAst';
import type { SanitizedTag } from '../../editor/schema/SchemaSanitizer';

interface FileUploadProps {
  onSuccess: (
    ast: XmlElement,
    schema: SanitizedTag[],
    tagToPm: Map<string, string>,
    pmToTag: Map<string, string>,
    fileName: string
  ) => void;
  onError: (messages: string[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onSuccess, onError }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    let xmlText: string;
    try {
      xmlText = await file.text();
    } catch {
      onError(['Failed to read file.']);
      return;
    }

    // 1. Syntax-level XML parse
    const parseResult = parseXml(xmlText);
    if (!parseResult.ok) {
      onError([parseResult.message]);
      return;
    }

    // 2. Build Generic AST
    let ast: XmlElement;
    try {
      ast = xmlToAst(parseResult.nodes);
    } catch (err) {
      onError([`AST error: ${err instanceof Error ? err.message : String(err)}`]);
      return;
    }

    // 3. Discover schema
    const rawSchema = new SchemaDiscoverer().discover(ast);

    // 4. Sanitize — rename hyphens, reserved names → safe ProseMirror node names
    const { sanitized, tagToPm, pmToTag } = sanitizeSchema(rawSchema);

    onSuccess(ast, sanitized, tagToPm, pmToTag, file.name);
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
