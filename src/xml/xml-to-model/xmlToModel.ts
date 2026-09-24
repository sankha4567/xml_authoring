/**
 * Generic XML → AST Adapter
 *
 * Converts raw fast-xml-parser output into the generic, recursive Abstract Syntax Tree (AST).
 * Zero hardcoding. Handles any tag names and infinite nesting.
 */

import type { ParsedXmlArray, ParsedXmlObject } from '../parser/parseXml';
import type { XmlElement, XmlNode } from '../../document-model/GenericAst';

function getTagName(node: ParsedXmlObject): string | null {
  for (const key of Object.keys(node)) {
    if (key !== ':@') return key;
  }
  return null;
}

function getAttrs(node: ParsedXmlObject): Record<string, string> {
  const raw = node[':@'];
  const result: Record<string, string> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;

  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const attrKey = k.startsWith('@_') ? k.slice(2) : k;
    result[attrKey] = String(v);
  }
  return result;
}

function getChildren(node: ParsedXmlObject, tag: string): ParsedXmlArray {
  const raw = node[tag];
  if (!Array.isArray(raw)) return [];
  return raw as ParsedXmlArray;
}

export function xmlToAst(nodes: ParsedXmlArray): XmlElement {
  // Find the root element (first non-text, non-comment node)
  let rootTag: string | null = null;
  let rootNode: ParsedXmlObject | null = null;

  for (const node of nodes) {
    const tag = getTagName(node);
    // Skip: text nodes, comments, and XML processing instructions like <?xml ...?>
    if (tag && tag !== '#text' && tag !== '#comment' && !tag.startsWith('?')) {
      rootTag = tag;
      rootNode = node;
      break;
    }
  }

  if (!rootTag || !rootNode) {
    throw new Error('xmlToAst: No root element found in XML.');
  }

  return convertElement(rootNode, rootTag);
}

const FORMATTING_MARKS: Record<string, string> = {
  bold: 'bold',
  b: 'bold',
  strong: 'bold',
  italic: 'italic',
  i: 'italic',
  em: 'italic',
  underline: 'underline',
  u: 'underline',
};

function convertElement(node: ParsedXmlObject, tag: string): XmlElement {
  const childrenArray = getChildren(node, tag);
  const children: XmlNode[] = [];

  for (const child of childrenArray) {
    const childTag = getTagName(child);

    if (childTag === '#comment') continue;

    if (childTag === '#text' || childTag === null) {
      // Normalize whitespace like professional XML editors: 
      // collapse newlines and tabs to single spaces.
      const raw = childTag === null ? '' : (child[childTag] as string | undefined);
      const rawText = typeof raw === 'string' ? raw : String(raw ?? '');
      const text = rawText.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ');
      
      // Crucial: Only preserve text nodes that have actual content.
      // Otherwise, formatting newlines/spaces between structural blocks (like <section>\n  <heading>)
      // will be captured as text nodes, causing SchemaDiscoverer to treat <section> as a text block!
      if (text.trim().length > 0) {
        children.push({ type: 'text', text });
      }
    } else {
      const markName = childTag ? FORMATTING_MARKS[childTag.toLowerCase()] : undefined;
      if (markName) {
        const innerChildren = getChildren(child, childTag!);
        const textParts: string[] = [];
        for (const ic of innerChildren) {
          const icTag = getTagName(ic);
          if (icTag === '#text' || icTag === null) {
            const raw = icTag === null ? '' : (ic[icTag] as string | undefined);
            textParts.push(String(raw ?? ''));
          }
        }
        const rawText = textParts.join('').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ');
        if (rawText.trim().length > 0) {
          children.push({ type: 'text', text: rawText, marks: [markName] });
          continue;
        }
      }

      children.push(convertElement(child, childTag));
    }
  }

  return {
    type: 'element',
    tag,
    attrs: getAttrs(node),
    children,
  };
}
