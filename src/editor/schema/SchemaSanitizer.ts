/**
 * Schema Sanitizer
 *
 * ProseMirror has strict rules on node type names:
 *   - Only letters, digits, and underscores allowed (NO hyphens, dots, colons, etc.)
 *   - Certain names are reserved primitives (text, doc, paragraph, hard_break)
 *
 * This module takes raw DiscoveredTag[] from SchemaDiscoverer and produces
 * SanitizedTag[] where every `pmName` is guaranteed to be a valid, non-conflicting
 * ProseMirror node name. The original XML tag is always preserved in `xmlTag`
 * so round-trip serialization restores exact original tag names.
 */

import type { DiscoveredTag } from './SchemaDiscoverer';

export interface SanitizedTag extends DiscoveredTag {
  /** Safe ProseMirror node name — no hyphens, no reserved words */
  pmName: string;
  /** Original XML tag name — used for HTML data-xml-tag attribute and XML export */
  xmlTag: string;
}

/** ProseMirror built-in node names that are provided by standard extensions */
export const RESERVED_PM_NAMES = new Set([
  'doc',
  'text',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'hard_break',
  'image',
  'link',
  'a',
]);

/** Standard XML tags mapped to Tiptap's built-in rich text nodes */
export const STANDARD_NODE_ALIASES: Record<string, string> = {
  paragraph: 'paragraph',
  p: 'paragraph',
  heading: 'heading',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  'bullet-list': 'bulletList',
  bullet_list: 'bulletList',
  ul: 'bulletList',
  'ordered-list': 'orderedList',
  ordered_list: 'orderedList',
  ol: 'orderedList',
  'list-item': 'listItem',
  list_item: 'listItem',
  li: 'listItem',
};

/**
 * Convert an XML tag name to a valid ProseMirror node name.
 */
export function topmName(xmlTag: string): string {
  const lower = xmlTag.toLowerCase();
  if (STANDARD_NODE_ALIASES[lower]) {
    return STANDARD_NODE_ALIASES[lower];
  }

  // Replace any char that's not a letter, digit, or underscore with underscore
  let name = xmlTag.replace(/[^a-zA-Z0-9_]/g, '_');

  // Must start with a letter or underscore (not a digit)
  if (/^[0-9]/.test(name)) {
    name = `tag_${name}`;
  }

  // Avoid collisions with ProseMirror reserved names
  if (RESERVED_PM_NAMES.has(name)) {
    name = `xml_${name}`;
  }

  return name;
}

/**
 * Sanitize all discovered tags so they are safe for ProseMirror.
 * Returns the sanitized list and both direction maps.
 */
export function sanitizeSchema(tags: DiscoveredTag[]): {
  sanitized: SanitizedTag[];
  tagToPm: Map<string, string>;   // xmlTag  → pmName
  pmToTag: Map<string, string>;   // pmName  → xmlTag
} {
  const sanitized: SanitizedTag[] = [];
  const tagToPm = new Map<string, string>();
  const pmToTag = new Map<string, string>();
  const usedPmNames = new Set<string>();

  for (const tag of tags) {
    let pmName = topmName(tag.tag);

    // Handle collisions: if two different XML tags map to the same pmName, append a counter
    if (usedPmNames.has(pmName) && pmToTag.get(pmName) !== tag.tag) {
      let i = 2;
      while (usedPmNames.has(`${pmName}_${i}`)) i++;
      pmName = `${pmName}_${i}`;
    }

    usedPmNames.add(pmName);
    tagToPm.set(tag.tag, pmName);
    pmToTag.set(pmName, tag.tag);

    sanitized.push({ ...tag, pmName, xmlTag: tag.tag });
  }

  return { sanitized, tagToPm, pmToTag };
}
