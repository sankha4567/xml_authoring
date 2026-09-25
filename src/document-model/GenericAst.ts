/**
 * Generic Abstract Syntax Tree (AST) for XML Documents
 * 
 * Replaces hardcoded types (ArticleNode, TitleNode, etc.).
 * Supports infinite nesting and completely arbitrary tag names.
 */

export interface XmlAttribute {
  [key: string]: string;
}

export interface XmlText {
  type: 'text';
  text: string;
  marks?: string[]; // Array of inline formatting tags applied to this text (e.g., ['bold', 'italic'])
  isCdata?: boolean;
}

export interface XmlElement {
  type: 'element';
  tag: string;
  attrs: XmlAttribute;
  children: (XmlElement | XmlText)[];
}

export type XmlNode = XmlElement | XmlText;
