/**
 * Internal Document Model → XML Serializer (Phase 9)
 *
 * Converts DocumentModel into a well-formed XML string.
 *
 * IMPORTANT:
 *   - Must NOT import Tiptap types.
 *   - Must NOT import fast-xml-parser.
 *   - Must correctly escape XML special characters.
 */

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
// XML escape helpers
// ---------------------------------------------------------------------------

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Attribute serialization
// ---------------------------------------------------------------------------

function serializeAttrs(
  attrs: Readonly<Record<string, string>> | undefined,
  extra?: Record<string, string>
): string {
  const all = { ...attrs, ...extra };
  const parts = Object.entries(all).map(
    ([k, v]) => ` ${k}="${escapeAttr(v)}"`
  );
  return parts.join('');
}

// ---------------------------------------------------------------------------
// Inline content serialization
// ---------------------------------------------------------------------------

function serializeInlineNodes(nodes: ReadonlyArray<InlineNode>): string {
  // Group consecutive text nodes with the same marks to produce clean output
  return nodes.map((node) => {
    // All InlineNode is TextNode (marks encoded on the text)
    const { text, marks } = node;

    // Wrap text in mark elements from innermost → outermost
    // marks array: [bold, link] means <bold><link>text</link></bold>
    let content = escapeText(text);

    // Apply marks in reverse (last mark = innermost element)
    const reversed = [...marks].reverse();
    for (const mark of reversed) {
      switch (mark.type) {
        case 'bold':
          content = `<bold>${content}</bold>`;
          break;
        case 'italic':
          content = `<italic>${content}</italic>`;
          break;
        case 'underline':
          content = `<underline>${content}</underline>`;
          break;
        case 'link': {
          const href = escapeAttr(mark.attrs?.['href'] ?? '');
          content = `<link href="${href}">${content}</link>`;
          break;
        }
      }
    }

    return content;
  }).join('');
}

// ---------------------------------------------------------------------------
// Block node serializers
// ---------------------------------------------------------------------------

function serializeTitle(node: TitleNode, indent: string): string {
  const inner = serializeInlineNodes(node.content);
  const attrs = serializeAttrs(node.attrs);
  return `${indent}<title${attrs}>${inner}</title>`;
}

function serializeHeading(node: HeadingNode, indent: string): string {
  const inner = serializeInlineNodes(node.content);
  const extra: Record<string, string> | undefined =
    node.level !== 2 ? { level: String(node.level) } : undefined;
  const attrs = serializeAttrs(node.attrs, extra);
  return `${indent}<heading${attrs}>${inner}</heading>`;
}

function serializeParagraph(node: ParagraphNode, indent: string): string {
  const inner = serializeInlineNodes(node.content);
  const attrs = serializeAttrs(node.attrs);
  return `${indent}<paragraph${attrs}>${inner}</paragraph>`;
}

function serializeListItem(node: ListItemNode, indent: string): string {
  const attrs = serializeAttrs(node.attrs);
  const childIndent = indent + '    ';
  const children = node.content
    .map((child) => {
      if (child.type === 'paragraph') return serializeParagraph(child, childIndent);
      if (child.type === 'heading') return serializeHeading(child, childIndent);
      return '';
    })
    .filter(Boolean)
    .join('\n');
  return `${indent}<list-item${attrs}>\n${children}\n${indent}</list-item>`;
}

function serializeBulletList(node: BulletListNode, indent: string): string {
  const attrs = serializeAttrs(node.attrs);
  const childIndent = indent + '    ';
  const items = node.items
    .map((item) => serializeListItem(item, childIndent))
    .join('\n');
  return `${indent}<bullet-list${attrs}>\n${items}\n${indent}</bullet-list>`;
}

function serializeOrderedList(node: OrderedListNode, indent: string): string {
  const attrs = serializeAttrs(node.attrs);
  const childIndent = indent + '    ';
  const items = node.items
    .map((item) => serializeListItem(item, childIndent))
    .join('\n');
  return `${indent}<ordered-list${attrs}>\n${items}\n${indent}</ordered-list>`;
}

function serializeSection(node: SectionNode, indent: string): string {
  const attrs = serializeAttrs(node.attrs);
  const childIndent = indent + '    ';
  const children = node.content
    .map((child) => serializeBlockNode(child, childIndent))
    .filter(Boolean)
    .join('\n\n');
  return `${indent}<section${attrs}>\n${children}\n${indent}</section>`;
}

function serializeBlockNode(node: BlockNode, indent: string): string {
  switch (node.type) {
    case 'title':
      return serializeTitle(node, indent);
    case 'heading':
      return serializeHeading(node, indent);
    case 'paragraph':
      return serializeParagraph(node, indent);
    case 'bullet-list':
      return serializeBulletList(node, indent);
    case 'ordered-list':
      return serializeOrderedList(node, indent);
    case 'section':
      return serializeSection(node, indent);
    default:
      return '';
  }
}

function serializeArticle(node: ArticleNode): string {
  const attrs = serializeAttrs(node.attrs);
  const indent = '    ';
  const titleStr = serializeTitle(node.title, indent);

  const bodyChildren = node.content
    .map((child) => serializeBlockNode(child, indent))
    .filter(Boolean)
    .join('\n\n');

  const body = bodyChildren.length > 0
    ? `${titleStr}\n\n${bodyChildren}\n`
    : `${titleStr}\n`;

  return `<article${attrs}>\n${body}</article>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Serialize a DocumentModel into a well-formed XML string.
 *
 * The serializer MUST NOT import Tiptap types.
 */
export function modelToXml(model: DocumentModel): string {
  const header = '<?xml version="1.0" encoding="UTF-8"?>';
  const body = serializeArticle(model.article);
  return `${header}\n${body}\n`;
}
