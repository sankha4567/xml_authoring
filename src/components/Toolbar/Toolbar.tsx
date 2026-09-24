/**
 * Toolbar Component
 *
 * Dynamic formatting toolbar. Checks if tags exist in the auto-discovered
 * schema before rendering their buttons.
 */

import React, { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface ToolbarProps {
  editor: Editor | null;
}

const LinkDialog: React.FC<{
  onConfirm: (href: string, text?: string) => void;
  onCancel: () => void;
  onUnlink?: () => void;
  initialHref?: string;
  initialText?: string;
  hasSelection: boolean;
  isLinked: boolean;
}> = ({ onConfirm, onCancel, onUnlink, initialHref = '', initialText = '', hasSelection, isLinked }) => {
  const [href, setHref] = useState(initialHref);
  const [text, setText] = useState(initialText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (href.trim()) {
      let finalHref = href.trim();
      if (!/^https?:\/\//i.test(finalHref) && !finalHref.startsWith('mailto:') && !finalHref.startsWith('#')) {
        finalHref = 'https://' + finalHref;
      }
      onConfirm(finalHref, text);
    }
  };

  return (
    <div className="link-dialog-overlay" onClick={onCancel}>
      <div className="link-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{isLinked ? 'Edit Link' : 'Insert Link'}</h3>
        <form onSubmit={handleSubmit}>
          {!hasSelection && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>
                Display Text
              </label>
              <input
                type="text"
                placeholder="Text to display"
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
              />
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>
              Link URL
            </label>
            <input
              type="text"
              placeholder="https://example.com"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              autoFocus
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
            />
          </div>
          <div className="link-dialog-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {isLinked && onUnlink && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginRight: 'auto', color: '#dc2626' }}
                onClick={onUnlink}
              >
                Remove Link
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isLinked ? 'Update' : 'Insert'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const handleLinkConfirm = useCallback(
    (href: string, text?: string) => {
      if (!editor) return;

      const { from, to } = editor.state.selection;
      const isCollapsed = from === to;

      if (isCollapsed) {
        const linkText = text && text.trim() ? text.trim() : href;
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text: linkText,
            marks: [{ type: 'link', attrs: { href } }],
          })
          .run();
      } else {
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          // @ts-ignore
          .setLink({ href })
          .run();
      }
      setShowLinkDialog(false);
    },
    [editor]
  );

  const handleUnlink = useCallback(() => {
    if (!editor) return;
    // @ts-ignore
    editor.chain().focus().unsetLink().run();
    setShowLinkDialog(false);
  }, [editor]);

  if (!editor) {
    return <div className="toolbar toolbar--disabled" />;
  }

  // Compute active block style for the dropdown
  const currentStyle = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
    ? 'h3'
    : 'p';

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'p') {
      editor.chain().focus().setParagraph().run();
    } else if (val === 'h1') {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (val === 'h2') {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (val === 'h3') {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    }
  };

  const btn = (
    label: string,
    title: string,
    isActive: boolean,
    onClick: () => void,
    disabled = false
  ) => (
    <button
      key={title}
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
        {/* Style Dropdown (Word-like Styles) */}
        <select
          className="toolbar-style-select"
          value={currentStyle}
          onChange={handleStyleChange}
          title="Paragraph Style"
        >
          <option value="p">Normal Text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <div className="toolbar-divider" />

        {/* Standard Document Formatting (Bold, Italic, Underline) */}
        {btn('B', 'Bold (Ctrl+B)', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {btn('I', 'Italic (Ctrl+I)', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {btn('U', 'Underline (Ctrl+U)', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}

        <div className="toolbar-divider" />

        {/* Lists (Word-like Bullet and Numbered lists) */}
        {btn('• List', 'Bulleted List', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
        {btn('1. List', 'Numbered List', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}

        <div className="toolbar-divider" />

        {/* Link Button */}
        {btn('🔗 Link', 'Insert Link', editor.isActive('link'), () => setShowLinkDialog(true))}
      </div>

      {showLinkDialog && (
        <LinkDialog
          onConfirm={handleLinkConfirm}
          onCancel={() => setShowLinkDialog(false)}
          onUnlink={handleUnlink}
          initialHref={editor.getAttributes('link').href || ''}
          initialText={
            !editor.state.selection.empty
              ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)
              : ''
          }
          hasSelection={!editor.state.selection.empty}
          isLinked={editor.isActive('link')}
        />
      )}
    </>
  );
};
