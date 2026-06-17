'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Redo, Undo } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export default function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    editable: editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  React.useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="border border-border rounded-apple bg-card text-foreground p-4 min-h-[200px] flex items-center justify-center">
        <span className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Loading editor...</span>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-apple overflow-hidden bg-card text-foreground">
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-apple-gray dark:bg-sf-bg-elevatedDark border-b border-border">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-apple hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors ${
              editor.isActive('bold')
                ? 'text-apple-blue font-bold bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-apple hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors ${
              editor.isActive('italic')
                ? 'text-apple-blue font-bold bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
            title="Italic"
          >
            <Italic size={16} />
          </button>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded-apple hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors ${
              editor.isActive('heading', { level: 1 })
                ? 'text-apple-blue font-bold bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-apple hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors ${
              editor.isActive('heading', { level: 2 })
                ? 'text-apple-blue font-bold bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-apple hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors ${
              editor.isActive('bulletList')
                ? 'text-apple-blue font-bold bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-apple hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors ${
              editor.isActive('orderedList')
                ? 'text-apple-blue font-bold bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-apple hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors ${
              editor.isActive('blockquote')
                ? 'text-apple-blue font-bold bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
            title="Blockquote"
          >
            <Quote size={16} />
          </button>
          <div className="h-4 w-[1px] bg-border mx-1 ml-auto" />
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded-apple hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark disabled:opacity-30 transition-opacity"
            title="Undo"
          >
            <Undo size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded-apple hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark disabled:opacity-30 transition-opacity"
            title="Redo"
          >
            <Redo size={16} />
          </button>
        </div>
      )}
      <div className="p-4 min-h-[250px] outline-none prose dark:prose-invert max-w-none focus:outline-none">
        <EditorContent editor={editor} className="focus:outline-none" />
      </div>
    </div>
  );
}
