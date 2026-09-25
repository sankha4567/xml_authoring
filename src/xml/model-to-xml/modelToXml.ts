/**
 * Generic AST → XML Serializer
 *
 * Serializes the recursive Generic AST back into a well-formed XML string.
 * Handles any arbitrary tag name and attributes.
 */

import type { XmlElement, XmlNode } from '../../document-model/GenericAst';

export function astToXml(root: XmlElement): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
  serializeNode(root, 0, lines);
  return lines.join('\n');
}

function serializeNode(node: XmlNode, depth: number, out: string[]) {
  if (node.type === 'text') {
    if (node.isCdata) {
      const cdataText = `<![CDATA[${node.text}]]>`;
      if (out.length > 0) {
        out[out.length - 1] += cdataText;
      } else {
        out.push(cdataText);
      }
      return;
    }

    let text = escapeXml(node.text);
    if (node.marks && node.marks.length > 0) {
      for (const mark of node.marks) {
        text = `<${mark}>${text}</${mark}>`;
      }
    }
    // Append text to the last line if possible, avoiding extra newlines for mixed content
    if (out.length > 0) {
      out[out.length - 1] += text;
    } else {
      out.push(text);
    }
    return;
  }

  // It's an element
  const indent = '    '.repeat(depth);
  const attrs = serializeAttrs(node.attrs);
  
  if (node.children.length === 0) {
    out.push(`${indent}<${node.tag}${attrs}></${node.tag}>`);
    return;
  }

  // Check if children are purely text or mixed (inline elements).
  // If so, we serialize on a single line for neatness.
  const isInline = node.children.every(c => 
    c.type === 'text' || (c.type === 'element' && isInlineTag(c.tag))
  );

  if (isInline) {
    let line = `${indent}<${node.tag}${attrs}>`;
    
    // Temporarily capture inline content
    const tempOut: string[] = [line];
    for (const child of node.children) {
      serializeNode(child, 0, tempOut);
    }
    
    // Join the temp lines and add the closing tag
    tempOut[tempOut.length - 1] += `</${node.tag}>`;
    out.push(tempOut.join(''));
  } else {
    // Block element: separate lines
    out.push(`${indent}<${node.tag}${attrs}>`);
    for (const child of node.children) {
      serializeNode(child, depth + 1, out);
    }
    out.push(`${indent}</${node.tag}>`);
  }
}

// Simple heuristic for neat XML output formatting.
// (Doesn't affect parsing, just makes the raw XML readable).
const INLINE_GUESSES = new Set(['bold', 'italic', 'underline', 'link', 'b', 'i', 'u', 'span', 'a', 'strong', 'em']);
function isInlineTag(tag: string): boolean {
  return INLINE_GUESSES.has(tag);
}

function serializeAttrs(attrs: Record<string, string>): string {
  const parts = Object.entries(attrs).map(
    ([k, v]) => ` ${k}="${escapeAttr(v)}"`
  );
  return parts.join('');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str: string): string {
  return escapeXml(str).replace(/"/g, '&quot;');
}
