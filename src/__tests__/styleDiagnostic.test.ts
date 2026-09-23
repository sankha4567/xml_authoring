/**
 * Pipeline diagnostic test — verifies every formatting type round-trips correctly
 * and checks for whitespace issues in multi-line XML.
 */

import { describe, it, expect } from 'vitest';
import { parseXml } from '../xml/parser/parseXml';
import { validateXml } from '../xml/validation/validateXml';
import { xmlToModel } from '../xml/xml-to-model/xmlToModel';
import { modelToXml } from '../xml/model-to-xml/modelToXml';
import { modelToTiptap } from '../editor/model-to-tiptap/modelToTiptap';
import { tiptapToModel } from '../editor/tiptap-to-model/tiptapToModel';

function roundTrip(xml: string) {
  const parseResult = parseXml(xml);
  if (!parseResult.ok) throw new Error(parseResult.message);
  const v = validateXml(parseResult.nodes);
  if (!v.valid) throw new Error(v.errors.join(', '));
  const model = xmlToModel(parseResult.nodes);
  const tiptap = modelToTiptap(model);
  const modelBack = tiptapToModel(tiptap);
  const xmlOut = modelToXml(modelBack);
  return { model, tiptap, modelBack, xmlOut };
}

describe('Styling preservation diagnostics', () => {

  it('bold text: XML → model marks → tiptap marks → model marks → XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article><title>T</title><paragraph>Hello <bold>world</bold></paragraph></article>`;
    const { model, tiptap, xmlOut } = roundTrip(xml);

    // Model layer: TextNode has bold mark
    const para = model.article.content[0];
    expect(para.type).toBe('paragraph');
    if (para.type === 'paragraph') {
      const boldNode = para.content.find(n => n.marks.some(m => m.type === 'bold'));
      expect(boldNode?.text).toBe('world');
    }

    // Tiptap layer: mark exists on text node
    const tiptapPara = tiptap.content?.[1]; // index 0 = title
    const boldTiptap = tiptapPara?.content?.find(
      (n: { marks?: Array<{ type: string }> }) => n.marks?.some((m: { type: string }) => m.type === 'bold')
    );
    expect(boldTiptap).toBeDefined();

    // XML output: tag present
    expect(xmlOut).toContain('<bold>world</bold>');
    console.log('✓ bold XML output:', xmlOut.match(/<paragraph>.*<\/paragraph>/s)?.[0]);
  });

  it('italic text: preserved end-to-end', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article><title>T</title><paragraph><italic>slanted</italic></paragraph></article>`;
    const { xmlOut } = roundTrip(xml);
    expect(xmlOut).toContain('<italic>slanted</italic>');
    console.log('✓ italic XML output:', xmlOut.match(/<paragraph>.*<\/paragraph>/s)?.[0]);
  });

  it('underline text: preserved end-to-end', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article><title>T</title><paragraph><underline>underlined</underline></paragraph></article>`;
    const { xmlOut } = roundTrip(xml);
    expect(xmlOut).toContain('<underline>underlined</underline>');
  });

  it('link with href: attribute preserved end-to-end', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article><title>T</title><paragraph><link href="https://example.com">click</link></paragraph></article>`;
    const { xmlOut } = roundTrip(xml);
    expect(xmlOut).toContain('href="https://example.com"');
    expect(xmlOut).toContain('>click<');
    console.log('✓ link XML output:', xmlOut.match(/<paragraph>.*<\/paragraph>/s)?.[0]);
  });

  it('nested bold+italic: both marks present on same TextNode', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article><title>T</title><paragraph><bold><italic>combo</italic></bold></paragraph></article>`;
    const { model, xmlOut } = roundTrip(xml);
    const para = model.article.content[0];
    if (para.type === 'paragraph') {
      const node = para.content.find(n => n.text === 'combo');
      const types = node?.marks.map(m => m.type) ?? [];
      expect(types).toContain('bold');
      expect(types).toContain('italic');
    }
    // Both tags in output
    expect(xmlOut).toContain('<bold>');
    expect(xmlOut).toContain('<italic>');
    console.log('✓ nested marks XML output:', xmlOut.match(/<paragraph>.*<\/paragraph>/s)?.[0]);
  });

  it('heading level 2: default (no level attr in output)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article><title>T</title><section><heading>H2</heading></section></article>`;
    const { xmlOut, modelBack } = roundTrip(xml);
    const section = modelBack.article.content[0];
    if (section.type === 'section') {
      expect(section.content[0]?.type).toBe('heading');
      if (section.content[0]?.type === 'heading') {
        expect(section.content[0].level).toBe(2);
      }
    }
    // Level 2 should NOT emit level attr (it's the default)
    expect(xmlOut).toContain('<heading>H2</heading>');
    console.log('✓ h2 XML output:', xmlOut.match(/<heading[^>]*>.*<\/heading>/)?.[0]);
  });

  it('heading level 3: level attr emitted in output', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article><title>T</title><section><heading level="3">H3</heading></section></article>`;
    const { xmlOut, modelBack } = roundTrip(xml);
    const section = modelBack.article.content[0];
    if (section.type === 'section') {
      if (section.content[0]?.type === 'heading') {
        expect(section.content[0].level).toBe(3);
      }
    }
    expect(xmlOut).toContain('level="3"');
    console.log('✓ h3 XML output:', xmlOut.match(/<heading[^>]*>.*<\/heading>/)?.[0]);
  });

  it('section id attribute: preserved through full round-trip', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article><title>T</title><section id="intro"><paragraph>Text</paragraph></section></article>`;
    const { xmlOut, model } = roundTrip(xml);
    expect(model.article.content[0]?.attrs?.['id']).toBe('intro');
    expect(xmlOut).toContain('id="intro"');
    console.log('✓ section id XML output:', xmlOut.match(/<section[^>]*>/)?.[0]);
  });

  it('multi-line XML: whitespace normalized — no raw newlines in text nodes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article>
    <title>Test</title>
    <paragraph>
        Some text with <bold>bold</bold> inside.
    </paragraph>
</article>`;
    const { model, xmlOut } = roundTrip(xml);
    const para = model.article.content[0];
    if (para.type === 'paragraph') {
      const allText = para.content.map(n => n.text).join('');
      // Should NOT contain raw newlines or leading spaces from indentation
      expect(allText).not.toMatch(/\n/);
      expect(allText).not.toMatch(/^\s{2,}/); // no leading multi-space
      const hasBold = para.content.some(n => n.marks.some(m => m.type === 'bold'));
      console.log('  normalized text:', JSON.stringify(allText));
      expect(hasBold).toBe(true);
    }
    console.log('✓ multi-line XML output:', xmlOut.match(/<paragraph>[\s\S]*?<\/paragraph>/)?.[0]);
  });

  it('XML special chars: escaped in output', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article><title>T</title><paragraph>AT&amp;T &lt; 5</paragraph></article>`;
    const { xmlOut } = roundTrip(xml);
    expect(xmlOut).toContain('&amp;');
    expect(xmlOut).toContain('&lt;');
    expect(xmlOut).not.toContain('&T &<'); // never raw
    console.log('✓ escaped XML:', xmlOut.match(/<paragraph>.*<\/paragraph>/s)?.[0]);
  });

  it('link href: special chars escaped in attribute', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article><title>T</title><paragraph><link href="https://example.com/path?a=1&amp;b=2">link</link></paragraph></article>`;
    const { xmlOut } = roundTrip(xml);
    expect(xmlOut).toContain('&amp;');
    console.log('✓ link attr escaping:', xmlOut.match(/href="[^"]+"/)?.[0]);
  });
});
