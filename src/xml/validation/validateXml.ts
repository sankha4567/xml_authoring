/**
 * XML Structural Validation Layer (Phase 3)
 *
 * Validates the parsed XML node tree against the supported vocabulary
 * BEFORE converting to the Internal Document Model.
 *
 * IMPORTANT: Must NOT import Tiptap or Internal Document Model types.
 */

import type { ParsedXmlArray, ParsedXmlObject } from '../parser/parseXml';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ValidationSuccess {
  readonly valid: true;
}

export interface ValidationFailure {
  readonly valid: false;
  readonly errors: string[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ---------------------------------------------------------------------------
// Allowed child element maps
// ---------------------------------------------------------------------------

const ARTICLE_ALLOWED_CHILDREN = new Set([
  'title',
  'section',
  'paragraph',
  'bullet-list',
  'ordered-list',
]);

const SECTION_ALLOWED_CHILDREN = new Set([
  'heading',
  'paragraph',
  'bullet-list',
  'ordered-list',
  'section',
]);

const LIST_ALLOWED_CHILDREN = new Set(['list-item']);

const LIST_ITEM_ALLOWED_CHILDREN = new Set(['paragraph', 'heading']);



const ALL_BLOCK_ELEMENTS = new Set([
  'article',
  'title',
  'section',
  'heading',
  'paragraph',
  'bullet-list',
  'ordered-list',
  'list-item',
]);

const ALL_INLINE_ELEMENTS = new Set(['bold', 'italic', 'underline', 'link']);

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function getTagName(node: ParsedXmlObject): string | null {
  for (const key of Object.keys(node)) {
    if (key !== ':@') return key;
  }
  return null;
}

function getChildren(node: ParsedXmlObject, tag: string): ParsedXmlArray {
  const raw = node[tag];
  if (!Array.isArray(raw)) return [];
  return raw as ParsedXmlArray;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------


function validateListItem(
  node: ParsedXmlObject,
  errors: string[]
): void {
  const children = getChildren(node, 'list-item');
  for (const child of children) {
    const tag = getTagName(child);
    if (tag === null || tag === '#text' || tag === '#comment') continue;
    if (!LIST_ITEM_ALLOWED_CHILDREN.has(tag)) {
      errors.push(
        `Unsupported structure: <list-item> cannot contain <${tag}>. ` +
          `Allowed: paragraph, heading.`
      );
    }
  }
}

function validateList(
  node: ParsedXmlObject,
  listTag: 'bullet-list' | 'ordered-list',
  errors: string[]
): void {
  const children = getChildren(node, listTag);
  for (const child of children) {
    const tag = getTagName(child);
    if (tag === null || tag === '#text' || tag === '#comment') continue;
    if (!LIST_ALLOWED_CHILDREN.has(tag)) {
      errors.push(
        `Unsupported structure: <${listTag}> cannot contain <${tag}>. ` +
          `Only <list-item> is allowed.`
      );
    } else if (tag === 'list-item') {
      validateListItem(child, errors);
    }
  }
}

function validateSection(node: ParsedXmlObject, errors: string[]): void {
  const children = getChildren(node, 'section');
  for (const child of children) {
    const tag = getTagName(child);
    if (tag === null || tag === '#text' || tag === '#comment') continue;

    if (!SECTION_ALLOWED_CHILDREN.has(tag)) {
      if (ALL_BLOCK_ELEMENTS.has(tag) || ALL_INLINE_ELEMENTS.has(tag)) {
        errors.push(
          `Unsupported structure: <section> cannot contain <${tag}>.`
        );
      } else {
        errors.push(`Unsupported XML element: <${tag}>.`);
      }
    } else {
      if (tag === 'section') validateSection(child, errors);
      if (tag === 'bullet-list') validateList(child, 'bullet-list', errors);
      if (tag === 'ordered-list') validateList(child, 'ordered-list', errors);
    }
  }
}

function validateArticle(node: ParsedXmlObject, errors: string[]): void {
  const children = getChildren(node, 'article');

  // Must have at least one title
  const hasTitleNode = children.some(
    (child) => getTagName(child) === 'title'
  );
  if (!hasTitleNode) {
    errors.push('Invalid document: <article> requires <title>.');
  }

  // Validate allowed children
  for (const child of children) {
    const tag = getTagName(child);
    if (tag === null || tag === '#text' || tag === '#comment') continue;

    if (!ARTICLE_ALLOWED_CHILDREN.has(tag)) {
      if (ALL_BLOCK_ELEMENTS.has(tag) || ALL_INLINE_ELEMENTS.has(tag)) {
        errors.push(
          `Unsupported structure: <article> cannot directly contain <${tag}>.`
        );
      } else {
        errors.push(`Unsupported XML element: <${tag}>.`);
      }
    } else {
      if (tag === 'section') validateSection(child, errors);
      if (tag === 'bullet-list') validateList(child, 'bullet-list', errors);
      if (tag === 'ordered-list') validateList(child, 'ordered-list', errors);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate the parsed XML node array against the supported vocabulary.
 *
 * @param nodes - The ParsedXmlArray from the parser layer.
 * @returns ValidationResult
 */
export function validateXml(nodes: ParsedXmlArray): ValidationResult {
  const errors: string[] = [];

  // Find root element (skip XML declaration)
  let rootNode: ParsedXmlObject | null = null;
  for (const node of nodes) {
    const tag = getTagName(node);
    if (tag === '?xml' || tag === '#comment') continue;
    rootNode = node;
    break;
  }

  if (rootNode === null) {
    return { valid: false, errors: ['Invalid document: no root element found.'] };
  }

  const rootTag = getTagName(rootNode);
  if (rootTag !== 'article') {
    return {
      valid: false,
      errors: [
        `Unsupported document: root element must be <article>. Found: <${rootTag ?? 'unknown'}>.`,
      ],
    };
  }

  validateArticle(rootNode, errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
