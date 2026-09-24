/**
 * DocumentTree Component
 *
 * Renders the Generic AST as a VSCode-style collapsible folder tree.
 * Shows original XML tag names, expand/collapse per node, and a
 * text content preview for leaf text-holder nodes.
 */

import React, { useState } from 'react';
import type { XmlElement, XmlText, XmlNode } from '../../document-model/GenericAst';

interface DocumentTreeProps {
  ast: XmlElement | null;
}

export const DocumentTree: React.FC<DocumentTreeProps> = ({ ast }) => {
  if (!ast) {
    return (
      <div className="tree-empty">
        <span className="tree-empty-icon">📂</span>
        <span>No document loaded</span>
      </div>
    );
  }

  return (
    <div className="document-tree" role="tree" aria-label="Document structure">
      <TreeNode node={ast} depth={0} />
    </div>
  );
};

// ─── Tree Node ──────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: XmlElement;
  depth: number;
}

const DEPTH_COLORS = [
  '#89dceb', // teal    – depth 0
  '#cba6f7', // purple  – depth 1
  '#a6e3a1', // green   – depth 2
  '#fab387', // peach   – depth 3
  '#f9e2af', // yellow  – depth 4+
];

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth }) => {
  // Auto-expand first 2 levels
  const [open, setOpen] = useState(depth < 2);

  const elementChildren = node.children.filter(
    (c): c is XmlElement => c.type === 'element'
  );
  const hasChildren = elementChildren.length > 0;

  const textContent = getTextPreview(node.children);

  const tagColor = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];

  return (
    <div className="tree-node" role="treeitem" aria-expanded={hasChildren ? open : undefined}>
      <div
        className="tree-node-row"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => hasChildren && setOpen(o => !o)}
        title={node.tag}
      >
        {/* Arrow / spacer */}
        <span className="tree-arrow" aria-hidden>
          {hasChildren ? (open ? '▾' : '▸') : '·'}
        </span>

        {/* Icon */}
        <span className="tree-icon" aria-hidden>
          {hasChildren ? (open ? '📂' : '📁') : '📄'}
        </span>

        {/* Tag name */}
        <span className="tree-tag-name" style={{ color: tagColor }}>
          {node.tag}
        </span>

        {/* Attributes badge */}
        {Object.keys(node.attrs).length > 0 && (
          <span className="tree-attrs-badge" title={formatAttrs(node.attrs)}>
            @{Object.keys(node.attrs).length}
          </span>
        )}

        {/* Text preview */}
        {textContent && (
          <span className="tree-text-preview">
            {textContent}
          </span>
        )}
      </div>

      {/* Children */}
      {open && hasChildren && (
        <div className="tree-children" role="group">
          {elementChildren.map((child, i) => (
            <TreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTextPreview(children: XmlNode[]): string {
  const text = children
    .filter((c): c is XmlText => c.type === 'text')
    .map(c => c.text.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';
  return text.length > 38 ? text.slice(0, 38) + '…' : text;
}

function formatAttrs(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join('\n');
}

// ─── Node Counter (exported for StatusBar) ──────────────────────────────────

export function countNodes(node: XmlElement): number {
  return 1 + node.children
    .filter((c): c is XmlElement => c.type === 'element')
    .reduce((sum, child) => sum + countNodes(child), 0);
}
