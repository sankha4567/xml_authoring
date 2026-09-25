import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseXml } from './xml/parser/parseXml';
import { xmlToAst } from './xml/xml-to-model/xmlToModel';
import { SchemaDiscoverer } from './editor/schema/SchemaDiscoverer';
import { sanitizeSchema } from './editor/schema/SchemaSanitizer';
import { modelToTiptap } from './editor/model-to-tiptap/modelToTiptap';
import { tiptapToModel } from './editor/tiptap-to-model/tiptapToModel';
import { astToXml } from './xml/model-to-xml/modelToXml';
import type { XmlNode } from './document-model/GenericAst';

/**
 * Normalizes text for comparison (collapsing whitespace runs).
 */
function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Recursively extracts all text content from an AST.
 */
function extractAllText(node: XmlNode): string[] {
  if (node.type === 'text') {
    const trimmed = normalizeText(node.text);
    return trimmed ? [trimmed] : [];
  }
  const texts: string[] = [];
  for (const child of node.children) {
    texts.push(...extractAllText(child));
  }
  return texts;
}

/**
 * Recursively counts all element tags in an AST.
 */
function countElements(node: XmlNode): Record<string, number> {
  if (node.type === 'text') return {};
  const counts: Record<string, number> = { [node.tag]: 1 };
  for (const child of node.children) {
    const childCounts = countElements(child);
    for (const [tag, count] of Object.entries(childCounts)) {
      counts[tag] = (counts[tag] || 0) + count;
    }
  }
  return counts;
}

/**
 * Recursively extracts all attributes across the entire AST.
 */
function extractAllAttrs(node: XmlNode): { tag: string; attrs: Record<string, string> }[] {
  if (node.type === 'text') return [];
  const list: { tag: string; attrs: Record<string, string> }[] = [];
  if (Object.keys(node.attrs).length > 0) {
    list.push({ tag: node.tag, attrs: { ...node.attrs } });
  }
  for (const child of node.children) {
    list.push(...extractAllAttrs(child));
  }
  return list;
}

/**
 * Deep structural comparator that reports exact differences between two ASTs.
 */
function compareAstNodes(original: XmlNode, roundtrip: XmlNode, pathStr = 'root'): string[] {
  const diffs: string[] = [];

  if (original.type !== roundtrip.type) {
    diffs.push(`Type mismatch at ${pathStr}: original=${original.type}, roundtrip=${roundtrip.type}`);
    return diffs;
  }

  if (original.type === 'text' && roundtrip.type === 'text') {
    if (normalizeText(original.text) !== normalizeText(roundtrip.text)) {
      diffs.push(`Text mismatch at ${pathStr}: expected "${normalizeText(original.text)}" but got "${normalizeText(roundtrip.text)}"`);
    }
    return diffs;
  }

  if (original.type === 'element' && roundtrip.type === 'element') {
    if (original.tag !== roundtrip.tag) {
      diffs.push(`Tag mismatch at ${pathStr}: expected <${original.tag}> but got <${roundtrip.tag}>`);
    }

    // Check attributes
    const origAttrs = original.attrs || {};
    const rtAttrs = roundtrip.attrs || {};
    for (const [k, v] of Object.entries(origAttrs)) {
      if (rtAttrs[k] !== v) {
        diffs.push(`Attr mismatch at ${pathStr} for attr "${k}": expected "${v}" but got "${rtAttrs[k]}"`);
      }
    }

    // Compare non-empty children
    const origChildren = original.children.filter(c => c.type !== 'text' || normalizeText(c.text).length > 0);
    const rtChildren = roundtrip.children.filter(c => c.type !== 'text' || normalizeText(c.text).length > 0);

    if (origChildren.length !== rtChildren.length) {
      diffs.push(`Child count mismatch at ${pathStr} (<${original.tag}>): expected ${origChildren.length} children but got ${rtChildren.length}`);
    }

    const minLen = Math.min(origChildren.length, rtChildren.length);
    for (let i = 0; i < minLen; i++) {
      diffs.push(...compareAstNodes(origChildren[i], rtChildren[i], `${pathStr} > ${original.tag}[${i}]`));
    }
  }

  return diffs;
}

describe('Data Loss Verification Suite', () => {
  const sampleDir = path.resolve(__dirname, '../sample');
  const sampleFiles = fs.readdirSync(sampleDir).filter(f => f.endsWith('.xml'));

  sampleFiles.forEach(file => {
    it(`verifies zero data loss for sample/${file}`, () => {
      const xmlPath = path.join(sampleDir, file);
      const rawXml = fs.readFileSync(xmlPath, 'utf8');

      // 1. Parse XML
      const parseResult = parseXml(rawXml);
      expect(parseResult.ok, `Failed to parse syntax for ${file}`).toBe(true);
      if (!parseResult.ok) return;

      // 2. Build Generic AST
      const originalAst = xmlToAst(parseResult.nodes);

      // 3. Schema Discovery & Sanitization
      const discoverer = new SchemaDiscoverer();
      const rawSchema = discoverer.discover(originalAst);
      const { tagToPm, pmToTag } = sanitizeSchema(rawSchema);

      // 4. Model -> Tiptap JSON
      const tiptapJson = modelToTiptap(originalAst, tagToPm);

      // 5. Tiptap JSON -> Model
      const roundtripAst = tiptapToModel(tiptapJson, pmToTag);

      // 6. Model -> Exported XML String
      const exportedXml = astToXml(roundtripAst);

      // 7. Verify exported XML is well-formed XML syntax
      const reparseResult = parseXml(exportedXml);
      expect(reparseResult.ok, `Exported XML for ${file} has invalid syntax`).toBe(true);

      // Check 1: Text Content Preservation
      const origTexts = extractAllText(originalAst);
      const rtTexts = extractAllText(roundtripAst);
      expect(rtTexts, `Text loss in ${file}`).toEqual(origTexts);

      // Check 2: Element Count & Tag Preservation
      const origCounts = countElements(originalAst);
      const rtCounts = countElements(roundtripAst);
      expect(rtCounts, `Element counts or tags changed in ${file}`).toEqual(origCounts);

      // Check 3: Attribute Preservation
      const origAttrs = extractAllAttrs(originalAst);
      const rtAttrs = extractAllAttrs(roundtripAst);
      expect(rtAttrs, `Attributes lost in ${file}`).toEqual(origAttrs);

      // Check 4: Full structural node-by-node diff
      const diffs = compareAstNodes(originalAst, roundtripAst);
      if (diffs.length > 0) {
        console.error(`Structural differences found in ${file}:\n`, diffs.slice(0, 10).join('\n'));
      }
      expect(diffs, `Structural differences found in ${file}`).toEqual([]);

      // Check 5: Reparse exported XML and verify it reconstructs the exact same AST
      if (reparseResult.ok) {
        const reparsedAst = xmlToAst(reparseResult.nodes);
        expect(extractAllText(reparsedAst), `Text lost after re-parsing exported XML in ${file}`).toEqual(origTexts);
        expect(countElements(reparsedAst), `Elements lost after re-parsing exported XML in ${file}`).toEqual(origCounts);
        expect(extractAllAttrs(reparsedAst), `Attributes lost after re-parsing exported XML in ${file}`).toEqual(origAttrs);
      }
    });
  });

  it('verifies complex XML with namespaces, CDATA, and nested attributes', () => {
    const complexXml = `<?xml version="1.0" encoding="UTF-8"?>
<document id="doc-123" status="draft" xmlns:meta="http://example.com/meta">
    <meta:metadata>
        <meta:identifier>550e8400-e29b-41d4-a716-446655440000</meta:identifier>
        <meta:title>Enterprise Architecture</meta:title>
        <meta:description>Detailed architecture specification</meta:description>
        <meta:classification>INTERNAL</meta:classification>
    </meta:metadata>
    <section id="sec-1">
        <title>Overview</title>
        <paragraph>This is the overview paragraph with some content.</paragraph>
        <note type="important">Please read carefully.</note>
    </section>
</document>`;

    const parseResult = parseXml(complexXml);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const originalAst = xmlToAst(parseResult.nodes);
    const rawSchema = new SchemaDiscoverer().discover(originalAst);
    const { tagToPm, pmToTag } = sanitizeSchema(rawSchema);

    const tiptapJson = modelToTiptap(originalAst, tagToPm);
    const roundtripAst = tiptapToModel(tiptapJson, pmToTag);

    expect(extractAllText(roundtripAst)).toEqual(extractAllText(originalAst));
    expect(countElements(roundtripAst)).toEqual(countElements(originalAst));
    expect(extractAllAttrs(roundtripAst)).toEqual(extractAllAttrs(originalAst));

    // Verify exported XML
    const exportedXml = astToXml(roundtripAst);
    const reparseResult = parseXml(exportedXml);
    expect(reparseResult.ok).toBe(true);
  });

  it('verifies deeply nested XML structures (10 levels)', () => {
    const deepXml = `<?xml version="1.0" encoding="UTF-8"?>
<level1>
  <level2 id="l2">
    <level3>
      <level4>
        <level5>
          <level6>
            <level7>
              <level8>
                <level9>
                  <level10 status="deepest">
                    <content>Deep leaf text content reaches level 10 successfully.</content>
                  </level10>
                </level9>
              </level8>
            </level7>
          </level6>
        </level5>
      </level4>
    </level3>
  </level2>
</level1>`;

    const parseResult = parseXml(deepXml);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const originalAst = xmlToAst(parseResult.nodes);
    const rawSchema = new SchemaDiscoverer().discover(originalAst);
    const { tagToPm, pmToTag } = sanitizeSchema(rawSchema);

    const tiptapJson = modelToTiptap(originalAst, tagToPm);
    const roundtripAst = tiptapToModel(tiptapJson, pmToTag);

    expect(extractAllText(roundtripAst)).toEqual(extractAllText(originalAst));
    expect(countElements(roundtripAst)).toEqual(countElements(originalAst));
    expect(extractAllAttrs(roundtripAst)).toEqual(extractAllAttrs(originalAst));

    const exportedXml = astToXml(roundtripAst);
    const reparsed = parseXml(exportedXml);
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      expect(extractAllText(xmlToAst(reparsed.nodes))).toEqual(extractAllText(originalAst));
    }
  });

  it('verifies special character escaping and XML entities', () => {
    const specialXml = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <item id="item-&amp;-1" desc="&quot;High-End&quot; &amp; &lt;Quality&gt;">
    <title>Fish &amp; Chips</title>
    <description>Costs &lt; $50 &amp; tastes &gt; average!</description>
  </item>
</catalog>`;

    const parseResult = parseXml(specialXml);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const originalAst = xmlToAst(parseResult.nodes);
    const rawSchema = new SchemaDiscoverer().discover(originalAst);
    const { tagToPm, pmToTag } = sanitizeSchema(rawSchema);

    const tiptapJson = modelToTiptap(originalAst, tagToPm);
    const roundtripAst = tiptapToModel(tiptapJson, pmToTag);

    expect(extractAllText(roundtripAst)).toEqual(extractAllText(originalAst));
    expect(countElements(roundtripAst)).toEqual(countElements(originalAst));
    expect(extractAllAttrs(roundtripAst)).toEqual(extractAllAttrs(originalAst));

    const exportedXml = astToXml(roundtripAst);
    const reparsed = parseXml(exportedXml);
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      const reparsedAst = xmlToAst(reparsed.nodes);
      expect(extractAllText(reparsedAst)).toEqual(extractAllText(originalAst));
      expect(extractAllAttrs(reparsedAst)).toEqual(extractAllAttrs(originalAst));
    }
  });
});
