/**
 * Internal Document Model — Canonical source of truth.
 *
 * IMPORTANT: This module MUST NOT import anything from Tiptap, ProseMirror,
 * fast-xml-parser, or any other external library. It is framework-agnostic.
 */

// ---------------------------------------------------------------------------
// Inline nodes
// ---------------------------------------------------------------------------

export interface TextNode {
  readonly type: 'text';
  readonly text: string;
  readonly marks: ReadonlyArray<InlineMark>;
}

export type InlineMarkType = 'bold' | 'italic' | 'underline' | 'link';

export interface InlineMark {
  readonly type: InlineMarkType;
  /** Used for link marks: { href: string } */
  readonly attrs?: Readonly<Record<string, string>>;
}

/** All content that can appear inside a paragraph or heading */
export type InlineNode = TextNode;

// ---------------------------------------------------------------------------
// Block nodes
// ---------------------------------------------------------------------------

export interface TitleNode {
  readonly type: 'title';
  readonly content: ReadonlyArray<InlineNode>;
  readonly attrs?: Readonly<Record<string, string>>;
}

export interface HeadingNode {
  readonly type: 'heading';
  readonly level: 1 | 2 | 3;
  readonly content: ReadonlyArray<InlineNode>;
  readonly attrs?: Readonly<Record<string, string>>;
}

export interface ParagraphNode {
  readonly type: 'paragraph';
  readonly content: ReadonlyArray<InlineNode>;
  readonly attrs?: Readonly<Record<string, string>>;
}

export interface ListItemNode {
  readonly type: 'list-item';
  readonly content: ReadonlyArray<ParagraphNode | HeadingNode>;
  readonly attrs?: Readonly<Record<string, string>>;
}

export interface BulletListNode {
  readonly type: 'bullet-list';
  readonly items: ReadonlyArray<ListItemNode>;
  readonly attrs?: Readonly<Record<string, string>>;
}

export interface OrderedListNode {
  readonly type: 'ordered-list';
  readonly items: ReadonlyArray<ListItemNode>;
  readonly attrs?: Readonly<Record<string, string>>;
}

/** Content allowed directly inside a <section> or at article top-level */
export type BlockNode =
  | TitleNode
  | HeadingNode
  | ParagraphNode
  | BulletListNode
  | OrderedListNode
  | SectionNode;

export interface SectionNode {
  readonly type: 'section';
  readonly content: ReadonlyArray<BlockNode>;
  readonly attrs?: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export interface ArticleNode {
  readonly type: 'article';
  /**
   * First child MUST be a TitleNode. Subsequent children may be any BlockNode
   * except another TitleNode.
   */
  readonly title: TitleNode;
  readonly content: ReadonlyArray<Exclude<BlockNode, TitleNode>>;
  readonly attrs?: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// Top-level document
// ---------------------------------------------------------------------------

export interface DocumentModel {
  readonly article: ArticleNode;
}

// ---------------------------------------------------------------------------
// Union over all node types (useful for visitors)
// ---------------------------------------------------------------------------

export type DocumentNode =
  | ArticleNode
  | TitleNode
  | SectionNode
  | HeadingNode
  | ParagraphNode
  | BulletListNode
  | OrderedListNode
  | ListItemNode
  | TextNode;
