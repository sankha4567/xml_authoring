/**
 * Round-Trip Tests
 *
 * Tests the full pipeline:
 * XML → parseXml → validateXml → xmlToModel → modelToTiptap → tiptapToModel → modelToXml
 *
 * Covers all 18 test cases from the spec.
 */

import { describe, it, expect } from 'vitest';
import { parseXml } from '../xml/parser/parseXml';
import { validateXml } from '../xml/validation/validateXml';
import { xmlToModel } from '../xml/xml-to-model/xmlToModel';
import { modelToXml } from '../xml/model-to-xml/modelToXml';
import { modelToTiptap } from '../editor/model-to-tiptap/modelToTiptap';
import { tiptapToModel } from '../editor/tiptap-to-model/tiptapToModel';
import type { DocumentModel } from '../document-model/types';

// ---- Helpers ----

function fullRoundTrip(xmlInput: string): {
  model: DocumentModel;
  tiptapJson: ReturnType<typeof modelToTiptap>;
  modelAfterTiptap: DocumentModel;
  xmlOutput: string;
} {
  const parseResult = parseXml(xmlInput);
  if (!parseResult.ok) throw new Error(`Parse failed: ${parseResult.message}`);

  const validation = validateXml(parseResult.nodes);
  if (!validation.valid) throw new Error(`Validation failed: ${validation.errors.join(', ')}`);

  const model = xmlToModel(parseResult.nodes);
  const tiptapJson = modelToTiptap(model);
  const modelAfterTiptap = tiptapToModel(tiptapJson);
  const xmlOutput = modelToXml(modelAfterTiptap);

  return { model, tiptapJson, modelAfterTiptap, xmlOutput };
}

function makeArticle(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<article>
    <title>Test</title>
    ${body}
</article>`;
}

// ---- Test 1: Plain paragraph ----
describe('Round-trip: plain paragraph', () => {
  it('preserves paragraph text', () => {
    const xml = makeArticle('<paragraph>Hello world</paragraph>');
    const { modelAfterTiptap } = fullRoundTrip(xml);
    const para = modelAfterTiptap.article.content[0];
    expect(para.type).toBe('paragraph');
    if (para.type === 'paragraph') {
      expect(para.content[0]?.text).toBe('Hello world');
    }
  });
});

// ---- Test 2: Bold ----
describe('Round-trip: bold', () => {
  it('preserves bold mark', () => {
    const xml = makeArticle('<paragraph>Hello <bold>world</bold></paragraph>');
    const { modelAfterTiptap } = fullRoundTrip(xml);
    const para = modelAfterTiptap.article.content[0];
    if (para.type === 'paragraph') {
      const boldNode = para.content.find((n) =>
        n.marks.some((m) => m.type === 'bold')
      );
      expect(boldNode).toBeDefined();
      expect(boldNode?.text).toBe('world');
    }
  });
});

// ---- Test 3: Italic ----
describe('Round-trip: italic', () => {
  it('preserves italic mark', () => {
    const xml = makeArticle('<paragraph><italic>italic text</italic></paragraph>');
    const { modelAfterTiptap } = fullRoundTrip(xml);
    const para = modelAfterTiptap.article.content[0];
    if (para.type === 'paragraph') {
      const italicNode = para.content.find((n) =>
        n.marks.some((m) => m.type === 'italic')
      );
      expect(italicNode?.text).toBe('italic text');
    }
  });
});

// ---- Test 4: Underline ----
describe('Round-trip: underline', () => {
  it('preserves underline mark', () => {
    const xml = makeArticle('<paragraph><underline>underlined</underline></paragraph>');
    const { modelAfterTiptap } = fullRoundTrip(xml);
    const para = modelAfterTiptap.article.content[0];
    if (para.type === 'paragraph') {
      const uNode = para.content.find((n) =>
        n.marks.some((m) => m.type === 'underline')
      );
      expect(uNode?.text).toBe('underlined');
    }
  });
});

// ---- Test 5: Nested formatting ----
describe('Round-trip: nested formatting', () => {
  it('preserves bold+italic combination', () => {
    const xml = makeArticle('<paragraph><bold><italic>combo</italic></bold></paragraph>');
    const { modelAfterTiptap } = fullRoundTrip(xml);
    const para = modelAfterTiptap.article.content[0];
    if (para.type === 'paragraph') {
      const node = para.content.find((n) => n.text === 'combo');
      const markTypes = node?.marks.map((m) => m.type) ?? [];
      expect(markTypes).toContain('bold');
      expect(markTypes).toContain('italic');
    }
  });
});

// ---- Test 6: Links ----
describe('Round-trip: links', () => {
  it('preserves link href', () => {
    const xml = makeArticle(
      '<paragraph><link href="https://example.com">Example</link></paragraph>'
    );
    const { modelAfterTiptap } = fullRoundTrip(xml);
    const para = modelAfterTiptap.article.content[0];
    if (para.type === 'paragraph') {
      const linkNode = para.content.find((n) =>
        n.marks.some((m) => m.type === 'link')
      );
      const linkMark = linkNode?.marks.find((m) => m.type === 'link');
      expect(linkNode?.text).toBe('Example');
      expect(linkMark?.attrs?.['href']).toBe('https://example.com');
    }
  });
});

// ---- Test 7: Headings ----
describe('Round-trip: headings', () => {
  it('preserves heading text and default level 2', () => {
    const xml = makeArticle('<section><heading>My Heading</heading></section>');
    const { modelAfterTiptap } = fullRoundTrip(xml);
    const section = modelAfterTiptap.article.content[0];
    if (section.type === 'section') {
      const heading = section.content[0];
      expect(heading.type).toBe('heading');
      if (heading.type === 'heading') {
        expect(heading.level).toBe(2);
        expect(heading.content[0]?.text).toBe('My Heading');
      }
    }
  });

  it('preserves heading level 3', () => {
    const xml = makeArticle('<section><heading level="3">Sub Heading</heading></section>');
    const { modelAfterTiptap } = fullRoundTrip(xml);
    const section = modelAfterTiptap.article.content[0];
    if (section.type === 'section') {
      const heading = section.content[0];
      if (heading.type === 'heading') {
        expect(heading.level).toBe(3);
      }
    }
  });
});

// ---- Test 8: Bullet lists ----
describe('Round-trip: bullet lists', () => {
  it('preserves bullet list items', () => {
    const xml = makeArticle(`
      <bullet-list>
        <list-item><paragraph>First</paragraph></list-item>
        <list-item><paragraph>Second</paragraph></list-item>
      </bullet-list>
    `);
    const { modelAfterTiptap } = fullRoundTrip(xml);
    const list = modelAfterTiptap.article.content[0];
    expect(list.type).toBe('bullet-list');
    if (list.type === 'bullet-list') {
      expect(list.items).toHaveLength(2);
      expect(list.items[0]?.content[0]?.type).toBe('paragraph');
    }
  });
});

// ---- Test 9: Ordered lists ----
describe('Round-trip: ordered lists', () => {
  it('preserves ordered list items', () => {
    const xml = makeArticle(`
      <ordered-list>
        <list-item><paragraph>Step 1</paragraph></list-item>
        <list-item><paragraph>Step 2</paragraph></list-item>
      </ordered-list>
    `);
    const { modelAfterTiptap } = fullRoundTrip(xml);
    const list = modelAfterTiptap.article.content[0];
    expect(list.type).toBe('ordered-list');
    if (list.type === 'ordered-list') {
      expect(list.items).toHaveLength(2);
    }
  });
});

// ---- Test 10: Multiple sections ----
describe('Round-trip: multiple sections', () => {
  it('preserves multiple top-level sections', () => {
    const xml = makeArticle(`
      <section id="s1"><paragraph>Section 1</paragraph></section>
      <section id="s2"><paragraph>Section 2</paragraph></section>
    `);
    const { modelAfterTiptap } = fullRoundTrip(xml);
    expect(modelAfterTiptap.article.content).toHaveLength(2);
    expect(modelAfterTiptap.article.content[0]?.type).toBe('section');
    expect(modelAfterTiptap.article.content[1]?.type).toBe('section');
  });
});

// ---- Test 11: XML attributes ----
describe('Round-trip: XML attributes', () => {
  it('preserves section id attribute through xmlToModel', () => {
    const xml = makeArticle('<section id="intro"><paragraph>Text</paragraph></section>');
    const parseResult = parseXml(xml);
    if (!parseResult.ok) throw new Error();
    const model = xmlToModel(parseResult.nodes);
    const section = model.article.content[0];
    if (section.type === 'section') {
      expect(section.attrs?.['id']).toBe('intro');
    }
  });

  it('serializes section id attribute to XML output', () => {
    const xml = makeArticle('<section id="intro"><paragraph>Text</paragraph></section>');
    const { xmlOutput } = fullRoundTrip(xml);
    expect(xmlOutput).toContain('id="intro"');
  });
});

// ---- Test 12: Special characters ----
describe('Round-trip: special characters', () => {
  it('escapes & in XML output', () => {
    const xml = makeArticle('<paragraph>AT&amp;T</paragraph>');
    const { xmlOutput } = fullRoundTrip(xml);
    expect(xmlOutput).toContain('&amp;');
  });

  it('escapes < in XML output', () => {
    const xml = makeArticle('<paragraph>a &lt; b</paragraph>');
    const { xmlOutput } = fullRoundTrip(xml);
    expect(xmlOutput).toContain('&lt;');
  });
});

// ---- Test 13: Unicode text ----
describe('Round-trip: Unicode text', () => {
  it('preserves Unicode characters', () => {
    const xml = makeArticle('<paragraph>こんにちは 🌍 Привет</paragraph>');
    const { modelAfterTiptap } = fullRoundTrip(xml);
    const para = modelAfterTiptap.article.content[0];
    if (para.type === 'paragraph') {
      const text = para.content.map((n) => n.text).join('');
      expect(text).toContain('こんにちは');
      expect(text).toContain('🌍');
      expect(text).toContain('Привет');
    }
  });
});

// ---- Test 14: Empty paragraphs ----
describe('Round-trip: empty paragraphs', () => {
  it('handles empty paragraph without crash', () => {
    const xml = makeArticle('<paragraph></paragraph>');
    expect(() => fullRoundTrip(xml)).not.toThrow();
  });
});

// ---- Test 15: Invalid XML ----
describe('Error handling: invalid XML', () => {
  it('returns parse error for malformed XML', () => {
    const result = parseXml('<article><title>Unclosed');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/invalid xml syntax/i);
    }
  });
});

// ---- Test 16: Unsupported elements ----
describe('Error handling: unsupported elements', () => {
  it('reports unsupported element in validation', () => {
    const xml = makeArticle('<foo>Bar</foo>');
    const parseResult = parseXml(xml);
    if (!parseResult.ok) throw new Error('Should parse');
    const validation = validateXml(parseResult.nodes);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.errors.some((e) => e.includes('<foo>'))).toBe(true);
    }
  });
});

// ---- Test 17: Wrong root element ----
describe('Error handling: wrong root element', () => {
  it('reports wrong root element', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><document><title>Hi</title></document>`;
    const parseResult = parseXml(xml);
    if (!parseResult.ok) throw new Error('Should parse');
    const validation = validateXml(parseResult.nodes);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.errors[0]).toMatch(/root element must be <article>/i);
    }
  });
});

// ---- Test 18: Missing title ----
describe('Error handling: missing title', () => {
  it('reports missing title in article', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article>
    <paragraph>No title here</paragraph>
</article>`;
    const parseResult = parseXml(xml);
    if (!parseResult.ok) throw new Error('Should parse');
    const validation = validateXml(parseResult.nodes);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.errors.some((e) => e.includes('<title>'))).toBe(true);
    }
  });
});
