/**
 * XmlEditor Component
 *
 * Tiptap editor that dynamically builds extensions from sanitized schema.
 * Accepts pmToTag map so tiptapToModel can reverse pmNames → xmlTags.
 */

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import Text from '@tiptap/extension-text';
import { History } from '@tiptap/extension-history';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';

import { generateExtensions } from '../../editor/extensions/ExtensionFactory';
import { tiptapToModel } from '../../editor/tiptap-to-model/tiptapToModel';
import type { XmlElement } from '../../document-model/GenericAst';
import type { SanitizedTag } from '../../editor/schema/SchemaSanitizer';
import { Toolbar } from '../Toolbar/Toolbar';

interface XmlEditorProps {
  initialContent: JSONContent;
  schema: SanitizedTag[];
  pmToTag: Map<string, string>;
  onModelChange: (ast: XmlElement) => void;
}

export const XmlEditor: React.FC<XmlEditorProps> = ({
  initialContent,
  schema,
  pmToTag,
  onModelChange,
}) => {
  const onModelChangeRef = useRef(onModelChange);
  onModelChangeRef.current = onModelChange;
  const pmToTagRef = useRef(pmToTag);
  pmToTagRef.current = pmToTag;

  const extensions = [
    ...generateExtensions(schema),
    Paragraph,
    Heading.configure({ levels: [1, 2, 3] }),
    BulletList,
    OrderedList,
    ListItem,
    Text,
    Bold,
    Italic,
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
        title: 'Ctrl + Click to open link',
      },
      defaultProtocol: 'https',
    }),
    History,
  ];

  const editor = useEditor({
    extensions,
    content: initialContent,
    onUpdate: ({ editor }) => {
      try {
        const ast = tiptapToModel(editor.getJSON(), pmToTagRef.current);
        onModelChangeRef.current(ast);
      } catch (err) {
        console.error('[tiptapToModel]', err);
      }
    },
    editorProps: {
      attributes: {
        class: 'xml-editor-content',
        'aria-label': 'Dynamic XML editor',
        role: 'textbox',
        'aria-multiline': 'true',
      },
      handleClick: (_view, _pos, event) => {
        if (event.ctrlKey || event.metaKey) {
          const target = event.target as HTMLElement;
          const anchor = target.closest('a');
          if (anchor && anchor.href) {
            window.open(anchor.href, '_blank', 'noopener,noreferrer');
            event.preventDefault();
            return true;
          }
        }
        return false;
      },
    },
  });

  // Sync content when a new file is uploaded (key change re-mounts, but just in case)
  const prevContentRef = useRef<JSONContent | null>(null);
  useEffect(() => {
    if (editor && initialContent !== prevContentRef.current) {
      prevContentRef.current = initialContent;
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [editor, initialContent]);

  return (
    <div className="editor-wrapper view-mode-doc">
      <Toolbar editor={editor} />
      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
