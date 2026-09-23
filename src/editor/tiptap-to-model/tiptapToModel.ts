/**
 * Tiptap → Internal Document Model Adapter (Phase 8)
 *
 * Converts Tiptap's JSONContent back into the Internal Document Model.
 * Called in editor's onUpdate hook.
 *
 * IMPORTANT:
 *   - Must NOT import fast-xml-parser or XML-layer types.
 *   - Must NOT perform XML serialization.
 *   - May import Tiptap types for the input JSON shape only.
 */

import type { JSONContent } from '@tiptap/core';
import type {
  ArticleNode,
  BlockNode,
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
} from '../../document-model/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TiptapMark = { type: string; attrs?: Record<string, unknown> };

function convertTextNode(node: JSONContent): InlineNode[] {
  if (node.type !== 'text') return [];
  const text = node.text ?? '';
  if (text.length === 0) return [];

  const marks: InlineMark[] = (node.marks ?? []).map(
    (m: TiptapMark): InlineMark => {
      if (m.type === 'link') {
        const href = typeof m.attrs?.['href'] === 'string' ? m.attrs['href'] : '';
        return { type: 'link', attrs: { href } };
      }
      return { type: m.type as InlineMark['type'] };
    }
  );

  const textNode: TextNode = { type: 'text', text, marks };
  return [textNode];
}

function convertInlineContent(nodes: JSONContent[] | undefined): InlineNode[] {
  if (!nodes) return [];
  return nodes.flatMap((node) => {
    if (node.type === 'text') return convertTextNode(node);
    return [];
  });
}

// ---------------------------------------------------------------------------
// Block converters
// ---------------------------------------------------------------------------

function convertTitle(node: JSONContent): TitleNode {
  return {
    type: 'title',
    content: convertInlineContent(node.content),
  };
}

function convertHeading(node: JSONContent): HeadingNode {
  const level = (node.attrs?.['level'] as number | undefined) ?? 2;
  const safeLevel: 1 | 2 | 3 = level === 1 ? 1 : level === 3 ? 3 : 2;
  return {
    type: 'heading',
    level: safeLevel,
    content: convertInlineContent(node.content),
  };
}

function convertParagraph(node: JSONContent): ParagraphNode {
  return {
    type: 'paragraph',
    content: convertInlineContent(node.content),
  };
}

function convertListItem(node: JSONContent): ListItemNode {
  const children = node.content ?? [];
  const content: Array<ParagraphNode | HeadingNode> = [];

  for (const child of children) {
    if (child.type === 'paragraph') content.push(convertParagraph(child));
    else if (child.type === 'xmlHeading') content.push(convertHeading(child));
  }

  if (content.length === 0) {
    content.push({ type: 'paragraph', content: [] });
  }

  return { type: 'list-item', content };
}

function convertBulletList(node: JSONContent): BulletListNode {
  const items = (node.content ?? []).map(convertListItem);
  return { type: 'bullet-list', items };
}

function convertOrderedList(node: JSONContent): OrderedListNode {
  const items = (node.content ?? []).map(convertListItem);
  return { type: 'ordered-list', items };
}

function convertSection(node: JSONContent): SectionNode {
  const rawAttrs = node.attrs as Record<string, unknown> | undefined;
  const attrs: Record<string, string> | undefined = rawAttrs
    ? Object.fromEntries(
        Object.entries(rawAttrs)
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      )
    : undefined;

  const content: Array<Exclude<BlockNode, TitleNode>> = [];
  for (const child of node.content ?? []) {
    const converted = convertBlock(child);
    if (converted && converted.type !== 'title') {
      content.push(converted as Exclude<BlockNode, TitleNode>);
    }
  }

  return {
    type: 'section',
    content,
    attrs: attrs && Object.keys(attrs).length > 0 ? attrs : undefined,
  };
}

function convertBlock(node: JSONContent): BlockNode | null {
  switch (node.type) {
    case 'title':
      return convertTitle(node);
    case 'xmlHeading':
      return convertHeading(node);
    case 'paragraph':
      return convertParagraph(node);
    case 'bulletList':
      return convertBulletList(node);
    case 'orderedList':
      return convertOrderedList(node);
    case 'section':
      return convertSection(node);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert Tiptap's JSONContent back into the Internal Document Model.
 * This is the inverse of modelToTiptap().
 *
 * @throws {Error} if the root node is not 'article' or has no title.
 */
export function tiptapToModel(json: JSONContent): DocumentModel {
  if (json.type !== 'article') {
    throw new Error(`tiptapToModel: expected 'article' root, got '${json.type}'.`);
  }

  const children = json.content ?? [];
  let title: TitleNode | null = null;
  const content: Array<Exclude<BlockNode, TitleNode>> = [];

  for (const child of children) {
    if (!title && child.type === 'title') {
      title = convertTitle(child);
      continue;
    }

    const block = convertBlock(child);
    if (block && block.type !== 'title') {
      content.push(block as Exclude<BlockNode, TitleNode>);
    }
  }

  if (!title) {
    title = { type: 'title', content: [] };
  }

  const article: ArticleNode = {
    type: 'article',
    title,
    content,
  };

  return { article };
}
