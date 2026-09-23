/**
 * XML Parser Layer
 *
 * Thin wrapper around fast-xml-parser.
 * Responsibility: parse XML syntax only. No domain/business logic.
 *
 * IMPORTANT: Must NOT import anything from Tiptap or the Internal Document Model.
 */

import { XMLParser, XMLValidator } from 'fast-xml-parser';

// ---------------------------------------------------------------------------
// Types produced by this layer
// ---------------------------------------------------------------------------

/**
 * A parsed XML node as returned by fast-xml-parser (jObj/preserveOrder format).
 * We use `unknown` for values to avoid circular type alias issues — callers
 * must narrow the type themselves.
 */
export type ParsedXmlObject = Record<string, unknown>;

export type ParsedXmlArray = ParsedXmlObject[];

export interface ParseXmlSuccess {
  readonly ok: true;
  /** The raw array returned by fast-xml-parser in array-mode */
  readonly nodes: ParsedXmlArray;
  /** Original XML string, kept for error reporting */
  readonly source: string;
}

export interface ParseXmlError {
  readonly ok: false;
  readonly message: string;
}

export type ParseXmlResult = ParseXmlSuccess | ParseXmlError;

// ---------------------------------------------------------------------------
// Parser configuration
// ---------------------------------------------------------------------------

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  attributesGroupName: ':@',
  textNodeName: '#text',
  preserveOrder: true,
  trimValues: false,
  parseAttributeValue: false,
  parseTagValue: false,
  cdataPropName: '#cdata',
  commentPropName: '#comment',
  isArray: () => true,
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an XML string.
 * Returns ParseXmlSuccess with the raw fast-xml-parser output, or ParseXmlError.
 */
export function parseXml(xmlString: string): ParseXmlResult {
  // Validate syntax first
  const validationResult = XMLValidator.validate(xmlString, {
    allowBooleanAttributes: false,
  });

  if (validationResult !== true) {
    return {
      ok: false,
      message: `Invalid XML syntax: ${validationResult.err.msg} (line ${validationResult.err.line}, col ${validationResult.err.col})`,
    };
  }

  try {
    const nodes = parser.parse(xmlString) as ParsedXmlArray;
    return { ok: true, nodes, source: xmlString };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `XML parse error: ${message}` };
  }
}
