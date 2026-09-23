/**
 * Tiptap Extensions — Custom node/mark types for the XML vocabulary.
 *
 * List nodes EXTEND the built-in Tiptap list extensions so they inherit
 * the keyboard shortcuts (Enter = new item, Backspace = lift/merge item).
 */

import { Node, mergeAttributes } from '@tiptap/core';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';

// ---------------------------------------------------------------------------
// Article — top-level document node (replaces 'doc')
// ---------------------------------------------------------------------------

export const Article = Node.create({
  name: 'article',
  topNode: true,
  /**
   * Explicit content spec: ONE title, followed by one-or-more of the
   * allowed block types.
   *
   * We do NOT use `block+` here because `title` is in the `block` group,
   * which would allow a second title to appear as part of `block+`.
   * Listing block types explicitly prevents that.
   */
  content: 'title (section | paragraph | bulletList | orderedList)+',
});


// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

export const Title = Node.create({
  name: 'title',
  // No 'group' — title is a singleton that can only appear once, as the
  // first child of the article node. Omitting the group prevents Tiptap
  // commands (toggleNode, setNode) from ever inserting a second title.
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'h1.xml-title' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['h1', mergeAttributes(HTMLAttributes, { class: 'xml-title' }), 0];
  },

  addKeyboardShortcuts() {
    return {
      /**
       * Enter inside the title → insert a paragraph immediately after the
       * title node and move the cursor into it.
       * This prevents the default ProseMirror behaviour of splitting the
       * title into a second title node.
       */
      Enter: () => {
        if (!this.editor.isActive('title')) return false;

        const { state } = this.editor;
        const { $from } = state.selection;

        // $from.after() gives the position just after the title node in
        // its parent (the article). Insert a paragraph there.
        const insertPos = $from.after(1);

        return this.editor
          .chain()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              const para = state.schema.nodes['paragraph']?.create() ??
                           state.schema.nodes['paragraph'].create();
              tr.insert(insertPos, para);
              // Move cursor to first position inside the new paragraph
              const resolvedPos = tr.doc.resolve(insertPos + 1);
              tr.setSelection(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (state.selection.constructor as any).near(resolvedPos)
              );
            }
            return true;
          })
          .run();
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export const Section = Node.create({
  name: 'section',
  group: 'block',
  // Explicit: sections may contain headings, paragraphs, lists, and nested
  // sections — but never a title node.
  content: '(xmlHeading | paragraph | bulletList | orderedList | section)+',
  addAttributes() {
    return {
      id: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'div.xml-section' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: 'xml-section' }),
      0,
    ];
  },
});

// ---------------------------------------------------------------------------
// Heading (level 2 or 3 via attribute)
// ---------------------------------------------------------------------------

export const XmlHeading = Node.create({
  name: 'xmlHeading',
  group: 'block',
  content: 'inline*',
  addAttributes() {
    return {
      level: { default: 2 },
    };
  },
  parseHTML() {
    return [
      { tag: 'h2', attrs: { level: 2 } },
      { tag: 'h3', attrs: { level: 3 } },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    const level: number = node.attrs['level'] ?? 2;
    const tag = level === 3 ? 'h3' : 'h2';
    return [tag, mergeAttributes(HTMLAttributes, { class: 'xml-heading' }), 0];
  },

  addKeyboardShortcuts() {
    return {
      /**
       * Enter at the END of a heading → create a paragraph below (Word behaviour).
       * Enter in the MIDDLE → allow default split (creates another heading).
       */
      Enter: () => {
        if (!this.editor.isActive('xmlHeading')) return false;

        const { state } = this.editor;
        const { $from, $to } = state.selection;

        // Only intercept when cursor is at the end of the heading
        const atEnd = $from.parentOffset === $from.parent.content.size;
        if (!atEnd) return false;

        return this.editor
          .chain()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              const para = state.schema.nodes['paragraph']?.create() ??
                           state.schema.nodes['paragraph'].create();
              const insertPos = $to.after();
              tr.insert(insertPos, para);
              const resolvedPos = tr.doc.resolve(insertPos + 1);
              tr.setSelection(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (state.selection.constructor as any).near(resolvedPos)
              );
            }
            return true;
          })
          .run();
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Paragraph
// ---------------------------------------------------------------------------

export const XmlParagraph = Node.create({
  name: 'paragraph',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'p' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { class: 'xml-paragraph' }), 0];
  },
});

// ---------------------------------------------------------------------------
// BulletList — extends the built-in to inherit keyboard shortcuts
// ---------------------------------------------------------------------------

export const XmlBulletList = BulletList.extend({
  // Keep the built-in name 'bulletList' so toggleList() works
});

// ---------------------------------------------------------------------------
// OrderedList — extends the built-in to inherit keyboard shortcuts
// ---------------------------------------------------------------------------

export const XmlOrderedList = OrderedList.extend({
  // Keep the built-in name 'orderedList'
});

// ---------------------------------------------------------------------------
// ListItem — extends the built-in to get Enter/Backspace keyboard handlers
//
// The built-in ListItem provides:
//   Enter  → split list item (creates new item)
//   Shift+Tab → lift list item out of list
//   Tab    → sink / indent (if nested lists are supported)
//   Backspace at start → lift or merge with previous item
// ---------------------------------------------------------------------------

export const XmlListItem = ListItem.extend({
  // Override content: our list items only wrap paragraph or xmlHeading
  content: 'paragraph | xmlHeading',
});
