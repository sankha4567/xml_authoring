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
    const marks = node.marks?.map(m => {
      let tiptapType = m;
      if (m === 'strong' || m === 'b') tiptapType = 'bold';
      else if (m === 'em' || m === 'i') tiptapType = 'italic';
      else if (m === 'u') tiptapType = 'underline';
      return { type: tiptapType, attrs: { origTag: m } };
    }) || [];
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
      marks: [{
        type: 'link',
        attrs: {
          href,
          ...(node.attrs?.target ? { target: node.attrs.target } : {}),
          xmlAttrs: node.attrs || {},
        },
      }],
    };
  }

  return convertElement(node, tagToPm);
}

function convertElement(node: XmlElement, tagToPm: Map<string, string>): JSONContent {
  const pmName = tagToPm.get(node.tag) ?? node.tag;

  const result: JSONContent = { type: pmName };
  const hasCdata = node.children.some(c => c.type === 'text' && c.isCdata);
  const elementXmlAttrs: Record<string, string> = {
    ...(node.attrs || {}),
    ...(hasCdata ? { _isCdata: 'true' } : {}),
  };

  if (pmName === 'heading') {
    const rawLevel = Number(node.attrs?.level || (node.tag.toLowerCase() === 'h2' ? 2 : node.tag.toLowerCase() === 'h3' ? 3 : 1));
    const hadLevelAttr = Boolean(node.attrs && 'level' in node.attrs);
    result.attrs = {
      level: Math.min(Math.max(rawLevel, 1), 3),
      xmlAttrs: {
        ...elementXmlAttrs,
        _hadLevelAttr: hadLevelAttr ? 'true' : 'false',
      },
    };
  } else if (Object.keys(elementXmlAttrs).length > 0) {
    result.attrs = { xmlAttrs: elementXmlAttrs };
  }

  let children = node.children
    .map(c => convertNode(c, tagToPm))
    .filter((c): c is JSONContent => c !== null);

  // If this is a listItem and children are direct text nodes, wrap in a synthetic paragraph
  // so Tiptap's listItem schema (content: 'paragraph block*') is satisfied without losing the fact
  // that the original XML had direct text.
  if (pmName === 'listItem' && children.some(c => c.type === 'text')) {
    children = [{ type: 'paragraph', attrs: { xmlAttrs: { _synthetic: 'true' } }, content: children }];
  }

  if (children.length > 0) {
    result.content = children;
  }

  return result;
}
