/**
 * Toolbar Component
 *
 * Formatting toolbar separate from the editor component.
 * Calls Tiptap editor commands; no domain model or XML logic here.
 */

import React, { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface ToolbarProps {
  editor: Editor | null;
}

const LinkDialog: React.FC<{
  onConfirm: (href: string) => void;
  onCancel: () => void;
  initial?: string;
}> = ({ onConfirm, onCancel, initial = '' }) => {
  const [href, setHref] = useState(initial);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (href.trim()) onConfirm(href.trim());
  };

  return (
    <div className="link-dialog-overlay">
      <div className="link-dialog">
        <h3>Insert Link</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="url"
            placeholder="https://example.com"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            autoFocus
            required
          />
          <div className="link-dialog-actions">
            <button type="submit" className="btn btn-primary">
              Insert
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const handleLinkConfirm = useCallback(
    (href: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href })
        .run();
      setShowLinkDialog(false);
    },
    [editor]
  );

  if (!editor) {
    return <div className="toolbar toolbar--disabled" />;
  }

  const btn = (
    label: string,
    title: string,
    isActive: boolean,
    onClick: () => void,
    disabled = false
  ) => (
    <button
      key={label}
      className={`toolbar-btn${isActive ? ' toolbar-btn--active' : ''}`}
      title={title}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="toolbar" role="toolbar" aria-label="Formatting toolbar">
        {btn(
          'B',
          'Bold',
          editor.isActive('bold'),
          () => editor.chain().focus().toggleBold().run()
        )}
        {btn(
          'I',
          'Italic',
          editor.isActive('italic'),
          () => editor.chain().focus().toggleItalic().run()
        )}
        {btn(
          'U',
          'Underline',
          editor.isActive('underline'),
          () => editor.chain().focus().toggleUnderline().run()
        )}

        <div className="toolbar-divider" />

        {btn(
          'H2',
          'Heading 2',
          editor.isActive('xmlHeading', { level: 2 }),
          () =>
            editor
              .chain()
              .focus()
              .toggleNode('xmlHeading', 'paragraph', { level: 2 })
              .run()
        )}
        {btn(
          'H3',
          'Heading 3',
          editor.isActive('xmlHeading', { level: 3 }),
          () =>
            editor
              .chain()
              .focus()
              .toggleNode('xmlHeading', 'paragraph', { level: 3 })
              .run()
        )}

        <div className="toolbar-divider" />

        {btn(
          '• List',
          'Bullet List',
          editor.isActive('bulletList'),
          () => editor.chain().focus().toggleList('bulletList', 'listItem').run()
        )}
        {btn(
          '1. List',
          'Ordered List',
          editor.isActive('orderedList'),
          () => editor.chain().focus().toggleList('orderedList', 'listItem').run()
        )}

        <div className="toolbar-divider" />

        {btn(
          'Link',
          'Insert Link',
          editor.isActive('link'),
          () => setShowLinkDialog(true)
        )}
        {btn(
          'Unlink',
          'Remove Link',
          false,
          () => editor.chain().focus().unsetLink().run(),
          !editor.isActive('link')
        )}
      </div>

      {showLinkDialog && (
        <LinkDialog
          onConfirm={handleLinkConfirm}
          onCancel={() => setShowLinkDialog(false)}
          initial={
            editor.isActive('link')
              ? (editor.getAttributes('link')['href'] as string | undefined) ?? ''
              : ''
          }
        />
      )}
    </>
  );
};
