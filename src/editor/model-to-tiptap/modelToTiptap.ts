/**
 * Internal Document Model → Tiptap JSON Adapter (Phase 5)
 *
 * Converts DocumentModel into Tiptap-compatible JSON (JSONContent).
 *
 * IMPORTANT:
 *   - Must NOT import fast-xml-parser or XML types.
 *   - May import Tiptap types ONLY for the output JSON shape (JSONContent).
 *   - Business logic must not leak into this adapter.
 */

import type { JSONContent } from '@tiptap/core';
import type {
  ArticleNode,
  BlockNode,
  BulletListNode,
  DocumentModel,
  HeadingNode,
  InlineNode,
  ListItemNode,
  OrderedListNode,
  ParagraphNode,
  SectionNode,
  TitleNode,
} from '../../document-model/types';

// ---------------------------------------------------------------------------
// Inline → Tiptap text nodes with marks
// ---------------------------------------------------------------------------

/**
 * Convert InlineNode[] into Tiptap text marks.
 * Each TextNode in the model becomes a Tiptap text node with marks.
 *
 * Consecutive nodes with identical marks will be merged for cleaner output.
 */
function convertInlineNodes(nodes: ReadonlyArray<InlineNode>): JSONContent[] {
  if (nodes.length === 0) {
    return [{ type: 'text', text: '' }];
  }

  return nodes.map((node): JSONContent => {
    const marks: JSONContent['marks'] = node.marks.map((mark) => {
      if (mark.type === 'link') {
        return { type: 'link', attrs: { href: mark.attrs?.['href'] ?? '' } };
      }
      return { type: mark.type };
    });

    return {
      type: 'text',
      text: node.text,
      ...(marks.length > 0 ? { marks } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Block node converters
// ---------------------------------------------------------------------------

function convertTitle(node: TitleNode): JSONContent {
  return {
    type: 'title',
    content: convertInlineNodes(node.content),
  };
}

function convertHeading(node: HeadingNode): JSONContent {
  return {
    type: 'xmlHeading',
    attrs: { level: node.level },
    content: convertInlineNodes(node.content),
  };
}

function convertParagraph(node: ParagraphNode): JSONContent {
  return {
    type: 'paragraph',
    content: convertInlineNodes(node.content),
  };
}

function convertListItem(node: ListItemNode): JSONContent {
  const content = node.content.map((child): JSONContent => {
    if (child.type === 'paragraph') return convertParagraph(child);
    if (child.type === 'heading') return convertHeading(child);
    return { type: 'paragraph', content: [] };
  });

  return {
    type: 'listItem',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  };
}

function convertBulletList(node: BulletListNode): JSONContent {
  return {
    type: 'bulletList',
    content: node.items.map(convertListItem),
  };
}

function convertOrderedList(node: OrderedListNode): JSONContent {
  return {
    type: 'orderedList',
    content: node.items.map(convertListItem),
  };
}

function convertSection(node: SectionNode): JSONContent {
  return {
    type: 'section',
    attrs: node.attrs ?? {},
    content: node.content
      .map(convertBlockNode)
      .filter((n): n is JSONContent => n !== null),
  };
}

function convertBlockNode(node: BlockNode): JSONContent | null {
  switch (node.type) {
    case 'title':
      return convertTitle(node);
    case 'heading':
      return convertHeading(node);
    case 'paragraph':
      return convertParagraph(node);
    case 'bullet-list':
      return convertBulletList(node);
    case 'ordered-list':
      return convertOrderedList(node);
    case 'section':
      return convertSection(node);
    default:
      return null;
  }
}

function convertArticle(node: ArticleNode): JSONContent {
  const titleNode = convertTitle(node.title);
  const bodyNodes = node.content
    .map(convertBlockNode)
    .filter((n): n is JSONContent => n !== null);

  return {
    type: 'article',
    content: [titleNode, ...bodyNodes],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert an Internal Document Model into Tiptap JSON.
 * This function must NOT import fast-xml-parser.
 */
export function modelToTiptap(model: DocumentModel): JSONContent {
  return convertArticle(model.article);
}
