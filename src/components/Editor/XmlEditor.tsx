/**
 * XmlEditor Component
 *
 * Tiptap rich-text editor wrapper.
 * Responsibilities:
 *   - Initialize Tiptap with custom extensions.
 *   - Accept Tiptap JSONContent to render.
 *   - Call onModelChange when user edits (via tiptapToModel).
 *
 * No XML parsing or serialization here.
 */

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import Text from '@tiptap/extension-text';
import { History } from '@tiptap/extension-history';

import {
  Article,
  Title,
  Section,
  XmlHeading,
  XmlParagraph,
  XmlBulletList,
  XmlOrderedList,
  XmlListItem,
} from '../../editor/extensions/nodes';
import { XmlBold, XmlItalic, XmlUnderline, XmlLink } from '../../editor/extensions/marks';
import { tiptapToModel } from '../../editor/tiptap-to-model/tiptapToModel';
import type { DocumentModel } from '../../document-model/types';
import { Toolbar } from '../Toolbar/Toolbar';

interface XmlEditorProps {
  initialContent: JSONContent | null;
  onModelChange: (model: DocumentModel) => void;
}

export const XmlEditor: React.FC<XmlEditorProps> = ({
  initialContent,
  onModelChange,
}) => {
  const onModelChangeRef = useRef(onModelChange);
  onModelChangeRef.current = onModelChange;

  const editor = useEditor({
    extensions: [
      // Node extensions
      Article,
      Title,
      Section,
      XmlHeading,
      XmlParagraph,
      XmlBulletList,
      XmlOrderedList,
      XmlListItem,
      // Built-in primitives
      Text,
      History,
      // Mark extensions
      XmlBold,
      XmlItalic,
      XmlUnderline,
      XmlLink,
    ],
    content: initialContent ?? undefined,
    onUpdate: ({ editor }) => {
      try {
        const json = editor.getJSON();
        const model = tiptapToModel(json);
        onModelChangeRef.current(model);
      } catch (err) {
        console.error('tiptapToModel error:', err);
      }
    },
    editorProps: {
      attributes: {
        class: 'xml-editor-content',
        'aria-label': 'XML document editor',
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
  });

  // When new content is loaded (new file upload), update editor
  const prevContentRef = useRef<JSONContent | null>(null);
  useEffect(() => {
    if (
      editor &&
      initialContent &&
      initialContent !== prevContentRef.current
    ) {
      prevContentRef.current = initialContent;
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [editor, initialContent]);

  return (
    <div className="editor-wrapper">
      <Toolbar editor={editor} />
      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
