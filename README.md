# XML Author

A production-quality, client-side XML authoring web application built with **React + TypeScript + Vite + Tiptap + fast-xml-parser**.

Inspired by the authoring mode of professional XML editors like Oxygen XML Editor, but runs entirely in the browser with no backend required.

![XML Author Screenshot](docs/screenshot.png)

---

## ✨ Features

- 📂 **Upload** any valid article XML file
- ✅ **Validate** document structure against the supported vocabulary with specific error messages
- ✏️ **Rich-text editing** — Bold, Italic, Underline, H2, H3, Bullet list, Ordered list, Link/Unlink
- 🔄 **Live synchronisation** — every edit updates the Internal Document Model in real time
- 💾 **Download** the edited document as clean, well-formed XML
- 🏗️ **Strict layered architecture** — XML ↔ Internal Document Model ↔ Tiptap, no shortcuts
- 🧪 **32 round-trip tests** verifying semantic preservation

---

## Architecture

The application enforces a strict 3-layer separation where the **Internal Document Model is the sole canonical source of truth**.

```
XML File
  ↓ fast-xml-parser          (syntax only)
Parsed XML
  ↓ validateXml()            (structural validation)
  ↓ xmlToModel()             (semantic conversion)
╔══════════════════════════╗
║  INTERNAL DOCUMENT MODEL ║  ← Canonical source of truth
╚══════════════════════════╝
  ↓ modelToTiptap()
Tiptap JSON
  ↓ Tiptap Editor (user edits)
Tiptap JSON
  ↓ tiptapToModel()
╔══════════════════════════╗
║  INTERNAL DOCUMENT MODEL ║  ← Updated
╚══════════════════════════╝
  ↓ modelToXml()
XML String → Download .xml
```

### Architectural Constraints (strictly enforced)

| Rule | Reason |
|---|---|
| `xml/` never imports Tiptap | XML layer is editor-agnostic |
| `editor/` never imports fast-xml-parser | Editor layer is parser-agnostic |
| `document-model/` imports nothing external | Domain model is framework-independent |
| No `xmlToTiptap()` shortcut | Architecture stays extensible |
| No `tiptapToXml()` shortcut | Model remains the canonical layer |

This separation means the architecture can later support multiple output formats from the same model:

```
Internal Document Model
  ├── XML    (implemented)
  ├── DOCX   (future)
  └── PDF    (future)
```

---

## Supported XML Vocabulary

```xml
<?xml version="1.0" encoding="UTF-8"?>
<article id="my-doc">
    <title>Document Title</title>

    <section id="intro">
        <heading>Section Heading</heading>
        <heading level="3">Sub-heading</heading>

        <paragraph>
            This is <bold>bold</bold>, <italic>italic</italic>,
            <underline>underlined</underline> and
            <link href="https://example.com">linked</link> text.
        </paragraph>

        <bullet-list>
            <list-item><paragraph>First item</paragraph></list-item>
            <list-item><paragraph>Second item</paragraph></list-item>
        </bullet-list>

        <ordered-list>
            <list-item><paragraph>Step one</paragraph></list-item>
            <list-item><paragraph>Step two</paragraph></list-item>
        </ordered-list>

        <section id="nested">
            <heading>Nested Section</heading>
            <paragraph>Sections can be nested to any depth.</paragraph>
        </section>
    </section>
</article>
```

| Category | Elements |
|---|---|
| Root | `<article>` |
| Block | `<title>`, `<section>`, `<heading>`, `<paragraph>`, `<bullet-list>`, `<ordered-list>`, `<list-item>` |
| Inline | `<bold>`, `<italic>`, `<underline>`, `<link href="...">` |
| Attributes | `id` on `<article>`, `<section>`; `level` on `<heading>` |

---

## Project Structure

```
src/
├── document-model/
│   ├── types.ts              # Canonical model — zero external imports
│   └── index.ts
│
├── xml/
│   ├── parser/
│   │   └── parseXml.ts       # fast-xml-parser wrapper (syntax only)
│   ├── validation/
│   │   └── validateXml.ts    # Structural validation with specific errors
│   ├── xml-to-model/
│   │   └── xmlToModel.ts     # Parsed XML → DocumentModel
│   └── model-to-xml/
│       └── modelToXml.ts     # DocumentModel → XML string
│
├── editor/
│   ├── extensions/
│   │   ├── nodes.ts          # Custom Tiptap node extensions
│   │   └── marks.ts          # Bold, Italic, Underline, Link
│   ├── model-to-tiptap/
│   │   └── modelToTiptap.ts  # DocumentModel → Tiptap JSON
│   └── tiptap-to-model/
│       └── tiptapToModel.ts  # Tiptap JSON → DocumentModel
│
├── components/
│   ├── Editor/XmlEditor.tsx
│   ├── Toolbar/Toolbar.tsx
│   ├── FileUpload/FileUpload.tsx
│   ├── Export/ExportXml.tsx
│   └── ValidationError/ValidationError.tsx
│
├── state/
│   └── useDocumentState.ts   # React useState — no Redux/Zustand
│
├── __tests__/
│   ├── roundTrip.test.ts     # 21 core round-trip tests
│   └── styleDiagnostic.test.ts  # 11 style-preservation tests
│
├── App.tsx                   # Layout only — no business logic
└── main.tsx

sample/
└── article.xml               # Full sample with all supported elements
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
git clone https://github.com/sankha4567/xml_authoring.git
cd xml_authoring
npm install
```

### Development

```bash
npm run dev
```

Opens at **http://localhost:5173**

### Production Build

```bash
npm run build
```

### Run Tests

```bash
npm run test           # Run all tests (32 tests)
npm run test:ui        # Open Vitest UI
```

---

## Usage

1. Click **Upload XML** and select an `.xml` file
2. The document is validated and rendered in the rich-text editor
3. Edit using the toolbar:
   - **B / I / U** — Bold, Italic, Underline
   - **H2 / H3** — Headings (press Enter at end to exit to paragraph)
   - **• List / 1. List** — Bullet and ordered lists (Enter = new item)
   - **Link / Unlink** — Insert or remove hyperlinks (click a link to open it)
4. Click **Download XML** to export the edited document

### Sample Document

A full sample XML is included at [`sample/article.xml`](sample/article.xml) demonstrating all supported elements.

---

## Validation Errors

The validator produces specific, actionable errors before opening the editor:

| Condition | Error Message |
|---|---|
| Bad XML syntax | `Invalid XML syntax: <parser message>` |
| Wrong root element | `Unsupported document: root element must be <article>` |
| Missing title | `Invalid document: <article> requires <title>` |
| Unknown element | `Unsupported XML element: <foo>` |
| Invalid child | `Unsupported structure: <section> cannot contain <foo>` |

---

## Tech Stack

| Technology | Role |
|---|---|
| [React 18](https://react.dev) | UI framework |
| [TypeScript](https://www.typescriptlang.org) | Strict type safety |
| [Vite](https://vite.dev) | Build tool & dev server |
| [Tiptap](https://tiptap.dev) | Rich-text editor (ProseMirror-based) |
| [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) | XML parsing |
| [Vitest](https://vitest.dev) | Unit & round-trip testing |
| Plain CSS | Styling (no Tailwind) |

---

## Testing

32 tests cover the full round-trip pipeline:

```
XML → parseXml → validateXml → xmlToModel
    → modelToTiptap → tiptapToModel → modelToXml
```

### Test Cases

| # | Case |
|---|---|
| 1 | Plain paragraph |
| 2 | Bold text |
| 3 | Italic text |
| 4 | Underline text |
| 5 | Nested bold+italic |
| 6 | Link with href |
| 7 | Heading level 2 (default) |
| 8 | Heading level 3 |
| 9 | Section id attribute |
| 10 | Bullet lists |
| 11 | Ordered lists |
| 12 | Multiple sections |
| 13 | XML attributes preserved |
| 14 | Special characters (`&amp;`, `&lt;`) |
| 15 | Unicode text |
| 16 | Multi-line XML whitespace normalization |
| 17 | Invalid XML syntax |
| 18 | Unsupported elements |
| 19 | Wrong root element |
| 20 | Missing title |
| 21+ | Style preservation diagnostics |

---

## Roadmap

This is a **Phase 1 MVP**. The architecture is designed to support:

- [ ] DOCX export (same Internal Model → different serializer)
- [ ] PDF export
- [ ] Monaco-based raw XML source editor (synced with visual editor via model)
- [ ] Larger XML vocabularies / custom schemas
- [ ] Collaboration (Yjs / WebRTC)
- [ ] Version history

---

## License

MIT
