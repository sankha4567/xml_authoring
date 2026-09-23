/**
 * XML → Internal Document Model Adapter (Phase 4)
 *
 * Converts the raw fast-xml-parser output into the Internal Document Model.
 *
 * IMPORTANT:
 *   - Must NOT import Tiptap types.
 *   - Must NOT import fast-xml-parser types beyond ParsedXmlArray.
 *   - Business/domain logic lives here, NOT in the parser layer.
 */

import type { ParsedXmlArray, ParsedXmlObject } from '../parser/parseXml';
import type {
  ArticleNode,
  BulletListNode,
  DocumentModel,
  HeadingNode,
  InlineMark,
  InlineNode,
  ListItemNode,
  OrderedListNode,
  ParagraphNode,
  SectionNode,
  TextNode,
  TitleNode,
  BlockNode,
} from '../../document-model/types';

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function getTagName(node: ParsedXmlObject): string | null {
  for (const key of Object.keys(node)) {
    if (key !== ':@') return key;
  }
  return null;
}

function getAttrs(node: ParsedXmlObject): Record<string, string> | undefined {
  const raw = node[':@'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;

  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const attrKey = k.startsWith('@_') ? k.slice(2) : k;
    result[attrKey] = String(v);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function getChildren(node: ParsedXmlObject, tag: string): ParsedXmlArray {
  const raw = node[tag];
  if (!Array.isArray(raw)) return [];
  return raw as ParsedXmlArray;
}

// ---------------------------------------------------------------------------
// Inline content conversion
// ---------------------------------------------------------------------------

/**
 * Convert inline content children into InlineNode[].
 * Handles mixed text + element content (e.g. "Hello <bold>world</bold>.").
 */
function convertInlineContent(
  children: ParsedXmlArray,
  inheritedMarks: InlineMark[] = []
): InlineNode[] {
  const result: InlineNode[] = [];

  for (const child of children) {
    const tag = getTagName(child);

    if (tag === '#text' || tag === null) {
      // Plain text node.
      // Normalize whitespace: XML source may contain newlines + indentation
      // (e.g. "\n    Hello ") from multi-line formatting. We collapse all
      // whitespace runs (including \n, \t) to single spaces, matching how
      // XML authoring tools treat mixed content.
      const raw = tag === null ? '' : (child[tag] as string | undefined);
      const rawText = typeof raw === 'string' ? raw : String(raw ?? '');
      const text = rawText.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ');
      if (text.length > 0) {
        const textNode: TextNode = {
          type: 'text',
          text,
          marks: inheritedMarks,
        };
        result.push(textNode);
      }
      continue;
    }

    if (tag === '#comment') continue;

    // Inline element
    const innerChildren = getChildren(child, tag);
    const attrs = getAttrs(child);

    let mark: InlineMark;
    switch (tag) {
      case 'bold':
        mark = { type: 'bold' };
        break;
      case 'italic':
        mark = { type: 'italic' };
        break;
      case 'underline':
        mark = { type: 'underline' };
        break;
      case 'link': {
        const href = attrs?.['href'] ?? '';
        mark = { type: 'link', attrs: { href } };
        break;
      }
      default:
        // Unknown inline — treat as plain text to avoid data loss
        continue;
    }

    const innerNodes = convertInlineContent(innerChildren, [
      ...inheritedMarks,
      mark,
    ]);
    result.push(...innerNodes);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Block node converters
// ---------------------------------------------------------------------------

function convertTitle(node: ParsedXmlObject): TitleNode {
  const children = getChildren(node, 'title');
  return {
    type: 'title',
    content: convertInlineContent(children),
    attrs: getAttrs(node),
  };
}

function convertHeading(node: ParsedXmlObject): HeadingNode {
  const children = getChildren(node, 'heading');
  const attrs = getAttrs(node);
  const levelStr = attrs?.['level'];
  const level = levelStr === '3' ? 3 : levelStr === '1' ? 1 : 2;

  // Remove 'level' from preserved attrs since we store it as a first-class field
  const preservedAttrs = attrs ? { ...attrs } : undefined;
  if (preservedAttrs) delete preservedAttrs['level'];

  return {
    type: 'heading',
    level,
    content: convertInlineContent(children),
    attrs:
      preservedAttrs && Object.keys(preservedAttrs).length > 0
        ? preservedAttrs
        : undefined,
  };
}

function convertParagraph(node: ParsedXmlObject): ParagraphNode {
  const children = getChildren(node, 'paragraph');
  return {
    type: 'paragraph',
    content: convertInlineContent(children),
    attrs: getAttrs(node),
  };
}

function convertListItem(node: ParsedXmlObject): ListItemNode {
  const children = getChildren(node, 'list-item');
  const content: Array<ParagraphNode | HeadingNode> = [];

  for (const child of children) {
    const tag = getTagName(child);
    if (tag === 'paragraph') content.push(convertParagraph(child));
    else if (tag === 'heading') content.push(convertHeading(child));
  }

  return {
    type: 'list-item',
    content,
    attrs: getAttrs(node),
  };
}

function convertBulletList(node: ParsedXmlObject): BulletListNode {
  const children = getChildren(node, 'bullet-list');
  const items: ListItemNode[] = [];

  for (const child of children) {
    const tag = getTagName(child);
    if (tag === 'list-item') items.push(convertListItem(child));
  }

  return {
    type: 'bullet-list',
    items,
    attrs: getAttrs(node),
  };
}

function convertOrderedList(node: ParsedXmlObject): OrderedListNode {
  const children = getChildren(node, 'ordered-list');
  const items: ListItemNode[] = [];

  for (const child of children) {
    const tag = getTagName(child);
    if (tag === 'list-item') items.push(convertListItem(child));
  }

  return {
    type: 'ordered-list',
    items,
    attrs: getAttrs(node),
  };
}

function convertSection(node: ParsedXmlObject): SectionNode {
  const children = getChildren(node, 'section');
  const content: BlockNode[] = [];

  for (const child of children) {
    const tag = getTagName(child);
    if (!tag || tag === '#text' || tag === '#comment') continue;

    switch (tag) {
      case 'heading':
        content.push(convertHeading(child));
        break;
      case 'paragraph':
        content.push(convertParagraph(child));
        break;
      case 'bullet-list':
        content.push(convertBulletList(child));
        break;
      case 'ordered-list':
        content.push(convertOrderedList(child));
        break;
      case 'section':
        content.push(convertSection(child));
        break;
      default:
        // Validation layer should have caught this
        break;
    }
  }

  return {
    type: 'section',
    content,
    attrs: getAttrs(node),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a validated ParsedXmlArray into the Internal Document Model.
 *
 * @throws {Error} if the root element is not <article> or the document
 *   structure is fundamentally broken (shouldn't happen after validation).
 */
export function xmlToModel(nodes: ParsedXmlArray): DocumentModel {
  // Find root <article>
  let articleNode: ParsedXmlObject | null = null;
  for (const node of nodes) {
    const tag = getTagName(node);
    if (tag === 'article') {
      articleNode = node;
      break;
    }
  }

  if (!articleNode) {
    throw new Error('xmlToModel: no <article> root element found.');
  }

  const articleChildren = getChildren(articleNode, 'article');

  let title: TitleNode | null = null;
  const content: Array<Exclude<BlockNode, TitleNode>> = [];

  for (const child of articleChildren) {
    const tag = getTagName(child);
    if (!tag || tag === '#text' || tag === '#comment') continue;

    switch (tag) {
      case 'title':
        if (!title) title = convertTitle(child);
        break;
      case 'section':
        content.push(convertSection(child));
        break;
      case 'paragraph':
        content.push(convertParagraph(child));
        break;
      case 'bullet-list':
        content.push(convertBulletList(child));
        break;
      case 'ordered-list':
        content.push(convertOrderedList(child));
        break;
      default:
        break;
    }
  }

  if (!title) {
    throw new Error('xmlToModel: <article> must contain a <title>.');
  }

  const article: ArticleNode = {
    type: 'article',
    title,
    content,
    attrs: getAttrs(articleNode),
  };

  return { article };
}
