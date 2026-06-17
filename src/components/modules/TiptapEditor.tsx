'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  Terminal,
  List,
  ListOrdered,
} from 'lucide-react';

interface TiptapEditorProps {
  content: any;
  onChange: (jsonContent: any) => void;
  placeholder?: string;
}

export default function TiptapEditor({ content, onChange, placeholder = 'Write something...' }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || { type: 'doc', content: [] },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[400px] text-sf-text-light dark:text-sf-text-dark w-full',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor && content) {
      const currentJson = editor.getJSON();
      if (JSON.stringify(currentJson) !== JSON.stringify(content)) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col border border-sf-border-light dark:border-sf-border-dark rounded-lg overflow-hidden bg-white dark:bg-sf-bg-dark">
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-sf-border-light dark:border-sf-border-dark bg-sf-bg-light dark:bg-sf-bg-elevatedDark sticky top-0 z-10">
        <select
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
              ? 'h2'
              : editor.isActive('heading', { level: 3 })
              ? 'h3'
              : 'p'
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          className="bg-transparent text-sm font-medium border border-sf-border-light dark:border-sf-border-dark rounded px-2 py-1 focus:outline-none text-sf-text-light dark:text-sf-text-dark"
        >
          <option value="p" className="bg-sf-bg-light dark:bg-sf-bg-dark">Paragraph</option>
          <option value="h1" className="bg-sf-bg-light dark:bg-sf-bg-dark">Heading 1</option>
          <option value="h2" className="bg-sf-bg-light dark:bg-sf-bg-dark">Heading 2</option>
          <option value="h3" className="bg-sf-bg-light dark:bg-sf-bg-dark">Heading 3</option>
        </select>

        <div className="w-px h-6 bg-sf-border-light dark:bg-sf-border-dark mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('bold')
              ? 'bg-sf-border-light dark:bg-sf-border-dark text-apple-blue'
              : 'hover:bg-sf-border-light/50 dark:hover:bg-sf-border-dark/50 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('italic')
              ? 'bg-sf-border-light dark:bg-sf-border-dark text-apple-blue'
              : 'hover:bg-sf-border-light/50 dark:hover:bg-sf-border-dark/50 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('strike')
              ? 'bg-sf-border-light dark:bg-sf-border-dark text-apple-blue'
              : 'hover:bg-sf-border-light/50 dark:hover:bg-sf-border-dark/50 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('code')
              ? 'bg-sf-border-light dark:bg-sf-border-dark text-apple-blue'
              : 'hover:bg-sf-border-light/50 dark:hover:bg-sf-border-dark/50 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
          }`}
          title="Code Inline"
        >
          <Code className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-sf-border-light dark:bg-sf-border-dark mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('bulletList')
              ? 'bg-sf-border-light dark:bg-sf-border-dark text-apple-blue'
              : 'hover:bg-sf-border-light/50 dark:hover:bg-sf-border-dark/50 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('orderedList')
              ? 'bg-sf-border-light dark:bg-sf-border-dark text-apple-blue'
              : 'hover:bg-sf-border-light/50 dark:hover:bg-sf-border-dark/50 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
          }`}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto max-h-[600px] bg-white dark:bg-sf-bg-dark">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
