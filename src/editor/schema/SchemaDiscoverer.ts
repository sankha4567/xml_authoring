/**
 * Auto-Schema Discoverer
 *
 * Analyzes a Generic AST and infers whether each tag is:
 *   - block       : structural container (only element children)
 *   - textBlock   : leaf text container (ONLY text children — no element children)
 *   - inline      : inline element inside a textBlock
 *
 * Mixed content (text + element children) is treated as 'block'.
 * ProseMirror cannot represent mixed content directly; treating it as
 * block allows the structural children to survive.
 */

import type { XmlElement, XmlNode } from '../../document-model/GenericAst';

export type TagGroup = 'block' | 'inline' | 'textBlock';

export interface DiscoveredTag {
  tag: string;
  group: TagGroup;
}

export class SchemaDiscoverer {
  private tags = new Map<string, DiscoveredTag>();

  public discover(root: XmlElement): DiscoveredTag[] {
    this.tags.clear();
    this.traverse(root, false);
    return Array.from(this.tags.values());
  }

  private traverse(node: XmlNode, parentIsTextBlock: boolean) {
    if (node.type === 'text') return;

    let group: TagGroup;

    if (parentIsTextBlock) {
      // Any element inside a textBlock must be inline
      group = 'inline';
    } else {
      const textChildren    = node.children.filter(c => c.type === 'text');
      const elementChildren = node.children.filter(c => c.type === 'element');
      const hasText         = textChildren.length > 0;
      const hasElements     = elementChildren.length > 0;

      if (hasText && !hasElements) {
        // Pure text container → textBlock (like <paragraph>, <title>)
        group = 'textBlock';
      } else {
        // Mixed content OR pure structural → treat as block
        // ProseMirror cannot model mixed content; structural wins.
        group = 'block';
      }
    }

    const existing = this.tags.get(node.tag);
    if (existing) {
      // Upgrade rules — once a tag is seen as something more specific, keep it
      if (group === 'inline' && existing.group !== 'inline') {
        existing.group = 'inline';
      } else if (group === 'textBlock' && existing.group === 'block') {
        existing.group = 'textBlock';
      }
    } else {
      this.tags.set(node.tag, { tag: node.tag, group });
    }

    const resolvedGroup = this.tags.get(node.tag)!.group;
    const isTextBlock = resolvedGroup === 'textBlock';

    for (const child of node.children) {
      this.traverse(child, isTextBlock || parentIsTextBlock);
    }
  }
}
