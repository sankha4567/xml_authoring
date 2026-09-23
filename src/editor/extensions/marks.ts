/**
 * Tiptap Mark Extensions
 *
 * Extends Tiptap's built-in marks (Bold, Italic, Underline, Link).
 * No XML-specific logic — marks only.
 */

import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

export const XmlBold = Bold.configure({});

export const XmlItalic = Italic.configure({});

export const XmlUnderline = Underline.configure({});

export const XmlLink = Link.configure({
  /**
   * openOnClick: true  — clicking a link opens it (standard authoring behavior).
   * Links open in a new tab via target="_blank" in HTMLAttributes.
   *
   * To EDIT the link text, click just before/after it and extend the selection
   * over it, then use the Toolbar → Link button to update the URL.
   */
  openOnClick: true,
  autolink: false,
  HTMLAttributes: {
    class: 'xml-link',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
});
