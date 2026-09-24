/**
 * Generic AST → Tiptap JSON Adapter
 *
 * Uses tagToPm map to convert original XML tag names → safe ProseMirror node names.
 * Tiptap always requires { type: "doc" } as root; the XML root becomes its sole child.
 */

import type { JSONContent } from '@tiptap/react';
import type { XmlElement, XmlNode } from '../../document-model/GenericAst';

export function modelToTiptap(
  root: XmlElement,
  tagToPm: Map<string, string>
): JSONContent {
  return {
    type: 'doc',
    content: [convertElement(root, tagToPm)],
  };
}

function convertNode(node: XmlNode, tagToPm: Map<string, string>): JSONContent | null {
  if (node.type === 'text') {
    if (!node.text.trim()) return null; // skip pure-whitespace text nodes
    const marks = node.marks?.map(m => ({ type: m })) || [];
    return {
      type: 'text',
      text: node.text,
      ...(marks.length > 0 ? { marks } : {}),
    };
  }

  // Handle link and a elements as inline text with link marks
  const lowerTag = node.tag.toLowerCase();
  if (lowerTag === 'link' || lowerTag === 'a') {
    const href = node.attrs?.href || node.attrs?.['xlink:href'] || '';
    const text = node.children
      .map(c => (c.type === 'text' ? c.text : ''))
      .join('');
    if (!text) return null;
    return {
      type: 'text',
      text,
      marks: [{ type: 'link', attrs: { href } }],
    };
  }

  return convertElement(node, tagToPm);
}

function convertElement(node: XmlElement, tagToPm: Map<string, string>): JSONContent {
  const pmName = tagToPm.get(node.tag) ?? node.tag;

  const result: JSONContent = { type: pmName };

  if (pmName === 'heading') {
    const rawLevel = Number(node.attrs?.level || (node.tag.toLowerCase() === 'h2' ? 2 : node.tag.toLowerCase() === 'h3' ? 3 : 1));
    result.attrs = {
      level: Math.min(Math.max(rawLevel, 1), 3),
      ...(node.attrs ? { xmlAttrs: node.attrs } : {}),
    };
  } else if (node.attrs && Object.keys(node.attrs).length > 0) {
    result.attrs = { xmlAttrs: node.attrs };
  }

  let children = node.children
    .map(c => convertNode(c, tagToPm))
    .filter((c): c is JSONContent => c !== null);

  // If this is a listItem and children are text nodes, wrap in a paragraph to satisfy Tiptap's listItem schema
  if (pmName === 'listItem' && children.some(c => c.type === 'text')) {
    children = [{ type: 'paragraph', content: children }];
  }

  if (children.length > 0) {
    result.content = children;
  }

  return result;
}
