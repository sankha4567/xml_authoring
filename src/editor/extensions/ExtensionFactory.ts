/**
 * Dynamic Tiptap Extension Factory
 *
 * Generates Tiptap Node extensions from SanitizedTag[].
 * Uses `pmName` (safe ProseMirror identifier) as the node type name,
 * but stores the original `xmlTag` in data-xml-tag so rendering and
 * serialization always use the correct XML tag names.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import { RESERVED_PM_NAMES } from '../schema/SchemaSanitizer';
import type { SanitizedTag } from '../schema/SchemaSanitizer';

export function generateExtensions(sanitizedTags: SanitizedTag[]) {
  if (sanitizedTags.length === 0) return [Document];

  const rootTag = sanitizedTags[0];

  // Tiptap's Document (topNode) references the root XML node by pmName
  const DynamicDocument = Document.extend({
    content: rootTag.pmName,
  });

  const extensions: ReturnType<typeof Node.create>[] = [DynamicDocument];

  for (const tagInfo of sanitizedTags) {
    const { pmName, xmlTag, group } = tagInfo;

    const addAttributes = () => ({
      xmlAttrs: {
        default: {},
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-xml-attrs');
          try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const attrs = attributes['xmlAttrs'] as Record<string, string> | undefined;
          if (!attrs || Object.keys(attrs).length === 0) return {};
          return { 'data-xml-attrs': JSON.stringify(attrs) };
        },
      },
    });

    if (pmName === rootTag.pmName) {
      // The XML root element — lives directly inside the hidden "doc" topNode
      extensions.push(Node.create({
        name: pmName,
        group: 'block',
        content: 'block*',
        addAttributes,
        parseHTML: () => [{ tag: `div[data-xml-tag="${xmlTag}"]` }],
        renderHTML: ({ HTMLAttributes }) =>
          ['div', mergeAttributes(HTMLAttributes, { 'data-xml-tag': xmlTag }), 0],
      }));
      continue;
    }

    if (RESERVED_PM_NAMES.has(pmName)) {
      // Standard built-in extensions (paragraph, heading, bulletList, etc.) handle this node
      continue;
    }

    if (group === 'textBlock') {
      extensions.push(Node.create({
        name: pmName,
        group: 'block',
        content: 'inline*',
        addAttributes,
        parseHTML: () => [{ tag: `div[data-xml-tag="${xmlTag}"]` }],
        renderHTML: ({ HTMLAttributes }) =>
          ['div', mergeAttributes(HTMLAttributes, { 'data-xml-tag': xmlTag }), 0],
      }));
    } else if (group === 'inline') {
      extensions.push(Node.create({
        name: pmName,
        group: 'inline',
        content: 'inline*',
        inline: true,
        addAttributes,
        parseHTML: () => [{ tag: `span[data-xml-tag="${xmlTag}"]` }],
        renderHTML: ({ HTMLAttributes }) =>
          ['span', mergeAttributes(HTMLAttributes, { 'data-xml-tag': xmlTag }), 0],
      }));
    } else {
      // Structural block
      extensions.push(Node.create({
        name: pmName,
        group: 'block',
        content: 'block*',
        addAttributes,
        parseHTML: () => [{ tag: `div[data-xml-tag="${xmlTag}"]` }],
        renderHTML: ({ HTMLAttributes }) =>
          ['div', mergeAttributes(HTMLAttributes, { 'data-xml-tag': xmlTag }), 0],
      }));
    }
  }

  return extensions;
}
