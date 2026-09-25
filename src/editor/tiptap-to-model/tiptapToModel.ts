/**
 * Tiptap JSON → Generic AST Adapter
 *
 * Uses pmToTag map to convert pmNames back to original XML tag names.
 * Tiptap JSON always has { type: "doc" } as root — we skip that and
 * treat its first child as the XML root element.
 */

import type { JSONContent } from '@tiptap/react';
import type { XmlElement, XmlNode } from '../../document-model/GenericAst';

export function tiptapToModel(
  json: JSONContent,
  pmToTag: Map<string, string>
): XmlElement {
  const xmlRoot = json.content?.[0];
  if (!xmlRoot || !xmlRoot.type) {
    throw new Error('tiptapToModel: No XML root found under doc node.');
  }
  const converted = convertNode(xmlRoot, pmToTag);
  if (!converted || converted.type === 'text') {
    throw new Error('tiptapToModel: XML root must be an element.');
  }
  return converted as XmlElement;
}

function convertNode(json: JSONContent, pmToTag: Map<string, string>): XmlNode | null {
  if (json.type === 'text') {
    if (!json.text) return null;
    const linkMark = json.marks?.find((m: any) => m.type === 'link');
    const otherMarks = json.marks
      ?.filter((m: any) => m.type !== 'link')
      .map((m: any) => m.attrs?.origTag || m.type) || [];

    const textNode: XmlNode = {
      type: 'text',
      text: json.text,
      marks: otherMarks.length > 0 ? otherMarks : undefined,
    };

    if (linkMark && (linkMark.attrs?.href || linkMark.attrs?.xmlAttrs?.href)) {
      const origAttrs = (linkMark.attrs?.xmlAttrs as Record<string, string>) || {};
      const href = linkMark.attrs?.href || origAttrs.href || '';
      return {
        type: 'element',
        tag: 'link',
        attrs: {
          ...origAttrs,
          ...(href ? { href } : {}),
          ...(linkMark.attrs?.target ? { target: linkMark.attrs.target } : {}),
        },
        children: [textNode],
      };
    }

    return textNode;
  }

  if (!json.type) return null;

  // Reverse map: pmName → original xmlTag
  let xmlTag = pmToTag.get(json.type) ?? json.type;

  const rawAttrs = (json.attrs?.xmlAttrs as Record<string, string>) ?? {};
  const attrs: Record<string, string> = { ...rawAttrs };

  if (json.type === 'heading') {
    const hadLevelAttr = rawAttrs._hadLevelAttr === 'true';
    if (hadLevelAttr && json.attrs?.level) {
      attrs.level = String(json.attrs.level);
    } else if (json.attrs?.level && json.attrs.level !== 1) {
      attrs.level = String(json.attrs.level);
    } else {
      delete attrs.level;
    }
  }

  const isCdata = rawAttrs._isCdata === 'true';
  delete attrs._synthetic;
  delete attrs._hadLevelAttr;
  delete attrs._isCdata;

  let children: XmlNode[] = [];
  if (json.content) {
    for (const child of json.content) {
      // If this is a listItem whose only child is a synthetic paragraph, unwrap it
      const isSyntheticPara = child.type === 'paragraph' && child.attrs?.xmlAttrs?._synthetic === 'true';
      if (json.type === 'listItem' && isSyntheticPara && json.content.length === 1) {
        if (child.content) {
          for (const inner of child.content) {
            const converted = convertNode(inner, pmToTag);
            if (converted) {
              if (isCdata && converted.type === 'text') converted.isCdata = true;
              children.push(converted);
            }
          }
        }
      } else {
        const converted = convertNode(child, pmToTag);
        if (converted) {
          if (isCdata && converted.type === 'text') converted.isCdata = true;
          children.push(converted);
        }
      }
    }
  }

  return {
    type: 'element',
    tag: xmlTag,
    attrs,
    children,
  };
}
