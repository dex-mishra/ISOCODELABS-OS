'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  GripVertical,
  Plus,
  Trash2,
  Bold,
  Code,
  Image as ImageIcon,
  Globe,
  Table as TableIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ExternalLink,
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface WorkspaceBlock {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'code' | 'image' | 'embed' | 'divider' | 'table';
  content: string; // Text or HTML
  meta?: {
    src?: string;
    caption?: string;
    url?: string;
    language?: string;
    rows?: string[][]; // For table rows: [["cell1", "cell2"], ["cell3", "cell4"]]
  };
}

interface BlockEditorProps {
  pageId: string;
  initialBlocks: WorkspaceBlock[];
  onSave: (blocks: WorkspaceBlock[]) => Promise<void>;
  partnerPresence: { userId: string; userName: string; status: 'viewing' | 'editing'; activeBlockId?: string } | null;
  onPresenceUpdate: (status: 'viewing' | 'editing', activeBlockId?: string) => void;
}

// ─── RICH TEXT BLOCK EDITOR (TIPTAP) ──────────────────────────────────────────
interface BlockTextEditorProps {
  block: WorkspaceBlock;
  onChange: (content: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  isFocused: boolean;
  placeholder?: string;
}

function BlockTextEditor({ block, onChange, onKeyDown, onFocus, isFocused, placeholder }: BlockTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: block.content,
    editorProps: {
      attributes: {
        class: 'outline-none focus:outline-none w-full max-w-none text-foreground prose dark:prose-invert',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => {
      onFocus();
    },
  });

  // Handle focus prop changes
  useEffect(() => {
    if (editor && isFocused && !editor.isFocused) {
      editor.commands.focus('end');
    }
  }, [isFocused, editor]);

  // Handle outside content updates (e.g. from websocket sync)
  useEffect(() => {
    if (editor && editor.getHTML() !== block.content && !editor.isFocused) {
      // Save cursor position
      const { from, to } = editor.state.selection;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.commands.setContent(block.content, false as any);
      try {
        editor.commands.setTextSelection({ from, to });
      } catch {
        // Ignore selection restore error if content changed length significantly
      }
    }
  }, [block.content, editor]);

  if (!editor) return null;

  // Render styling based on block type
  let fontClasses = 'text-base font-normal leading-relaxed';
  if (block.type === 'h1') fontClasses = 'text-3xl font-bold tracking-tight text-sf-text-light dark:text-sf-text-dark';
  if (block.type === 'h2') fontClasses = 'text-2xl font-bold tracking-tight text-sf-text-light dark:text-sf-text-dark';
  if (block.type === 'h3') fontClasses = 'text-xl font-semibold tracking-tight text-sf-text-light dark:text-sf-text-dark';
  if (block.type === 'bullet' || block.type === 'number') fontClasses = 'text-base font-normal list-item ml-4';

  return (
    <div 
      className={`relative w-full ${fontClasses}`}
      onKeyDown={onKeyDown}
    >
      {editor.isEmpty && (
        <span className="absolute left-0 top-0 text-neutral-400 dark:text-neutral-600 pointer-events-none select-none">
          {placeholder || (block.type === 'paragraph' ? "Type '/' for commands..." : "")}
        </span>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

// ─── MAIN BLOCK EDITOR COMPONENT ──────────────────────────────────────────────
export default function BlockEditor({ pageId, initialBlocks, onSave, partnerPresence, onPresenceUpdate }: BlockEditorProps) {
  const { user } = useAuth();
  const { socket } = useRealtime();

  const [blocks, setBlocks] = useState<WorkspaceBlock[]>(initialBlocks);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  
  // Slash command menu state
  const [slashMenuBlockId, setSlashMenuBlockId] = useState<string | null>(null);
  const [slashSearchTerm, setSlashSearchTerm] = useState('');
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isEditingRef = useRef(false);

  // Sync state if initialBlocks changes (e.g. page loads)
  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  // WebSockets Event Listeners
  useEffect(() => {
    if (!socket) return;

    // Listen to real-time block updates from partner
    socket.on('workspace:page:edit', (payload: { pageId: string; blocks: WorkspaceBlock[]; senderId: string }) => {
      if (payload.pageId === pageId && payload.senderId !== user?.id) {
        // Simple merge: preserve local modifications on active block if necessary, or simple last-write-wins
        // Since it's last-write-wins, replace blocks
        setBlocks(payload.blocks);
      }
    });

    return () => {
      socket.off('workspace:page:edit');
    };
  }, [socket, pageId, user]);

  // Trigger auto-save and WebSocket sync on block updates
  const handleBlockChange = useCallback((blockId: string, updatedFields: Partial<WorkspaceBlock>) => {
    isEditingRef.current = true;
    onPresenceUpdate('editing', blockId);

    setBlocks((prevBlocks) => {
      const newBlocks = prevBlocks.map((b) => (b.id === blockId ? { ...b, ...updatedFields } : b));
      
      // Emit websocket edit event
      if (socket) {
        socket.emit('workspace:page:edit', {
          pageId,
          blocks: newBlocks,
          senderId: user?.id,
        });
      }

      // Reset auto-save timer
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          await onSave(newBlocks);
          isEditingRef.current = false;
          onPresenceUpdate('viewing', blockId);
        } catch (e) {
          console.error('Auto-save failed:', e);
        }
      }, 2000);

      return newBlocks;
    });
  }, [socket, pageId, user, onSave, onPresenceUpdate]);

  // Handle re-ordering
  const handleReorder = (newBlocks: WorkspaceBlock[]) => {
    setBlocks(newBlocks);
    
    if (socket) {
      socket.emit('workspace:page:edit', {
        pageId,
        blocks: newBlocks,
        senderId: user?.id,
      });
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      await onSave(newBlocks);
    }, 2000);
  };

  // Keyboard navigation & block operations
  const handleTextKeyDown = (e: React.KeyboardEvent, index: number, block: WorkspaceBlock) => {
    const textLength = block.content.replace(/<[^>]*>/g, '').length;

    // Check if `/` is typed to open slash menu
    if (e.key === '/') {
      setSlashMenuBlockId(block.id);
      setSlashSearchTerm('');
      return;
    }

    // Escape closes slash menu
    if (e.key === 'Escape') {
      setSlashMenuBlockId(null);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Close slash menu if open
      setSlashMenuBlockId(null);

      // Create new paragraph block below
      const newBlock: WorkspaceBlock = {
        id: uuidv4(),
        type: 'paragraph',
        content: '',
      };
      
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      handleReorder(newBlocks);
      setFocusedBlockId(newBlock.id);
    } 
    else if (e.key === 'Backspace' && textLength === 0) {
      e.preventDefault();
      setSlashMenuBlockId(null);

      if (blocks.length > 1) {
        // Delete block and focus previous
        const newBlocks = blocks.filter((b) => b.id !== block.id);
        handleReorder(newBlocks);
        
        const prevBlock = blocks[index - 1];
        if (prevBlock) {
          setFocusedBlockId(prevBlock.id);
        }
      }
    } 
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSlashMenuBlockId(null);
      const prevBlock = blocks[index - 1];
      if (prevBlock) {
        setFocusedBlockId(prevBlock.id);
      }
    } 
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSlashMenuBlockId(null);
      const nextBlock = blocks[index + 1];
      if (nextBlock) {
        setFocusedBlockId(nextBlock.id);
      }
    }
  };

  // Convert block to another type
  const convertBlockType = (blockId: string, type: WorkspaceBlock['type']) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultMeta: any = {};
    if (type === 'table') {
      defaultMeta.rows = [
        ['', ''],
        ['', ''],
      ];
    } else if (type === 'code') {
      defaultMeta.language = 'javascript';
    } else if (type === 'image') {
      defaultMeta.src = '';
      defaultMeta.caption = '';
    } else if (type === 'embed') {
      defaultMeta.url = '';
    }

    handleBlockChange(blockId, {
      type,
      meta: defaultMeta,
    });
    setSlashMenuBlockId(null);
    setFocusedBlockId(blockId);
  };

  // Add a block manually via button
  const addBlockAtEnd = (type: WorkspaceBlock['type'] = 'paragraph') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultMeta: any = {};
    if (type === 'table') {
      defaultMeta.rows = [
        ['', ''],
        ['', ''],
      ];
    } else if (type === 'code') {
      defaultMeta.language = 'javascript';
    }

    const newBlock: WorkspaceBlock = {
      id: uuidv4(),
      type,
      content: '',
      meta: defaultMeta,
    };
    const newBlocks = [...blocks, newBlock];
    handleReorder(newBlocks);
    setFocusedBlockId(newBlock.id);
  };

  // Delete specific block
  const deleteBlock = (blockId: string) => {
    if (blocks.length > 1) {
      const newBlocks = blocks.filter((b) => b.id !== blockId);
      handleReorder(newBlocks);
      setSlashMenuBlockId(null);
    }
  };

  // Image upload handler
  const handleImageUpload = async (blockId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use raw fetch for upload (multipart form data) with auth token
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/workspace/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();

      handleBlockChange(blockId, {
        type: 'image',
        meta: {
          src: data.url,
          caption: file.name,
        },
      });
    } catch (e) {
      console.error('Image upload failed:', e);
    }
  };

  // ─── BLOCK RENDERING DISPATCHER ─────────────────────────────────────────────
  const renderBlockContent = (block: WorkspaceBlock, index: number) => {
    const isFocused = focusedBlockId === block.id;

    switch (block.type) {
      case 'code':
        return (
          <div className="w-full bg-neutral-900 text-neutral-100 rounded-apple p-4 font-mono text-sm relative">
            <div className="flex justify-between items-center mb-2 text-xs text-neutral-400">
              <select
                value={block.meta?.language || 'javascript'}
                onChange={(e) =>
                  handleBlockChange(block.id, {
                    meta: { ...block.meta, language: e.target.value },
                  })
                }
                className="bg-neutral-800 text-neutral-300 rounded border border-neutral-700 px-2 py-0.5 outline-none"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="sql">SQL</option>
                <option value="bash">Shell</option>
              </select>
              <span className="text-neutral-500">Code Editor</span>
            </div>
            <textarea
              value={block.content}
              onChange={(e) => handleBlockChange(block.id, { content: e.target.value })}
              placeholder="Paste or write code here..."
              rows={4}
              className="w-full bg-transparent outline-none resize-y border-none text-neutral-100 font-mono focus:ring-0 placeholder-neutral-700 p-0"
              onFocus={() => {
                setFocusedBlockId(block.id);
                onPresenceUpdate('editing', block.id);
              }}
            />
          </div>
        );

      case 'divider':
        return (
          <div 
            className="w-full py-4 group/divider cursor-pointer"
            onClick={() => setFocusedBlockId(block.id)}
          >
            <hr className="border-t border-neutral-200 dark:border-neutral-800" />
          </div>
        );

      case 'image':
        return (
          <div className="w-full rounded-apple border border-dashed border-neutral-300 dark:border-neutral-800 overflow-hidden bg-apple-gray dark:bg-sf-bg-elevatedDark p-4">
            {block.meta?.src ? (
              <div className="relative group/img text-center">
                <img
                  src={block.meta.src}
                  alt={block.meta.caption || 'Uploaded image'}
                  className="max-h-[350px] mx-auto rounded-apple object-contain"
                />
                <input
                  type="text"
                  value={block.meta.caption || ''}
                  onChange={(e) =>
                    handleBlockChange(block.id, {
                      meta: { ...block.meta, caption: e.target.value },
                    })
                  }
                  placeholder="Add a caption..."
                  className="mt-2 text-xs text-neutral-400 bg-transparent text-center border-none outline-none w-full focus:ring-0"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <ImageIcon size={32} className="text-neutral-400 mb-2" />
                <p className="text-sm font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                  Drag and drop an image or click to select
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(block.id, file);
                  }}
                  className="mt-2 text-xs text-apple-blue outline-none cursor-pointer"
                />
              </div>
            )}
          </div>
        );

      case 'embed':
        return (
          <div className="w-full bg-apple-gray dark:bg-sf-bg-elevatedDark border border-neutral-200 dark:border-neutral-800 rounded-apple p-4">
            <div className="flex gap-2 mb-2 items-center">
              <Globe size={16} className="text-neutral-400" />
              <input
                type="text"
                value={block.meta?.url || ''}
                onChange={(e) =>
                  handleBlockChange(block.id, {
                    meta: { ...block.meta, url: e.target.value },
                  })
                }
                placeholder="Enter embed URL (e.g. YouTube, Figma)..."
                className="bg-transparent text-sm border-none outline-none flex-grow focus:ring-0 text-foreground"
                onFocus={() => {
                  setFocusedBlockId(block.id);
                  onPresenceUpdate('editing', block.id);
                }}
              />
              {block.meta?.url && (
                <a
                  href={block.meta.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-apple-blue hover:underline text-xs flex items-center gap-1"
                >
                  Visit <ExternalLink size={12} />
                </a>
              )}
            </div>
            {block.meta?.url && block.meta.url.startsWith('http') ? (
              <div className="relative aspect-video rounded-apple overflow-hidden border border-neutral-300 dark:border-neutral-800 mt-2 bg-black">
                <iframe
                  src={block.meta.url}
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen
                  title="Web Embed"
                />
              </div>
            ) : null}
          </div>
        );

      case 'table':
        const rows = block.meta?.rows || [['', ''], ['', '']];
        const updateCell = (rIdx: number, cIdx: number, val: string) => {
          const newRows = rows.map((r, ri) => r.map((c, ci) => (ri === rIdx && ci === cIdx ? val : c)));
          handleBlockChange(block.id, { meta: { ...block.meta, rows: newRows } });
        };
        const addRow = () => {
          const newRows = [...rows, Array(rows[0].length).fill('')];
          handleBlockChange(block.id, { meta: { ...block.meta, rows: newRows } });
        };
        const addColumn = () => {
          const newRows = rows.map((r) => [...r, '']);
          handleBlockChange(block.id, { meta: { ...block.meta, rows: newRows } });
        };
        const removeRow = (rIdx: number) => {
          if (rows.length > 1) {
            const newRows = rows.filter((_, ri) => ri !== rIdx);
            handleBlockChange(block.id, { meta: { ...block.meta, rows: newRows } });
          }
        };

        return (
          <div className="w-full overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-apple p-4 bg-apple-gray dark:bg-sf-bg-elevatedDark">
            <table className="w-full border-collapse text-left text-sm text-foreground">
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-neutral-200 dark:border-neutral-800 group/tr">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2 border-r border-neutral-200 dark:border-neutral-800 min-w-[120px]">
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                          placeholder="Cell data..."
                          className="bg-transparent border-none outline-none w-full focus:ring-0 text-sm p-0 text-foreground"
                          onFocus={() => {
                            setFocusedBlockId(block.id);
                            onPresenceUpdate('editing', block.id);
                          }}
                        />
                      </td>
                    ))}
                    <td className="p-2 text-center w-8 opacity-0 group-hover/tr:opacity-100 transition-opacity">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(rIdx)}
                          className="text-apple-red hover:bg-neutral-200 dark:hover:bg-neutral-800 p-1 rounded"
                          title="Delete row"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-4 mt-3 text-xs">
              <button
                type="button"
                onClick={addRow}
                className="text-apple-blue hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus size={12} /> Add Row
              </button>
              <button
                type="button"
                onClick={addColumn}
                className="text-apple-blue hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus size={12} /> Add Column
              </button>
            </div>
          </div>
        );

      default:
        // Rich Text nodes: paragraph, h1, h2, h3, bullet, number
        return (
          <BlockTextEditor
            block={block}
            isFocused={isFocused}
            onChange={(html) => handleBlockChange(block.id, { content: html })}
            onKeyDown={(e) => handleTextKeyDown(e, index, block)}
            onFocus={() => {
              setFocusedBlockId(block.id);
              onPresenceUpdate('viewing', block.id);
            }}
            placeholder={block.type === 'paragraph' ? "Type '/' for commands..." : ''}
          />
        );
    }
  };

  const filteredSlashItems = [
    { type: 'paragraph', label: 'Text', desc: 'Plain paragraph block', icon: <Bold size={14} /> },
    { type: 'h1', label: 'Heading 1', desc: 'Large section heading', icon: <Heading1 size={14} /> },
    { type: 'h2', label: 'Heading 2', desc: 'Medium section heading', icon: <Heading2 size={14} /> },
    { type: 'h3', label: 'Heading 3', desc: 'Small section heading', icon: <Heading3 size={14} /> },
    { type: 'bullet', label: 'Bullet List', desc: 'Create a simple bullet point', icon: <List size={14} /> },
    { type: 'number', label: 'Numbered List', desc: 'Create a numbered list item', icon: <ListOrdered size={14} /> },
    { type: 'code', label: 'Code Block', desc: 'Add syntax highlighted code', icon: <Code size={14} /> },
    { type: 'image', label: 'Image', desc: 'Upload image from computer', icon: <ImageIcon size={14} /> },
    { type: 'embed', label: 'Embed Site', desc: 'Embed site iframe URL', icon: <Globe size={14} /> },
    { type: 'table', label: 'Table Grid', desc: 'Insert an editable table', icon: <TableIcon size={14} /> },
    { type: 'divider', label: 'Divider', desc: 'Horizontal separation line', icon: <Plus size={14} /> },
  ].filter(
    (item) =>
      item.label.toLowerCase().includes(slashSearchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(slashSearchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-4">
      {/* Dynamic Toolbar for editing formatting */}
      {focusedBlockId && (
        <div className="flex items-center gap-1.5 p-2 bg-neutral-100 dark:bg-sf-bg-elevatedDark border border-border rounded-apple sticky top-0 z-40 shadow-apple-sm">
          <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium px-2 border-r border-border mr-1.5 select-none">
            BLOCK
          </span>
          <button
            type="button"
            onClick={() => convertBlockType(focusedBlockId, 'paragraph')}
            className={`p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs transition-all ${
              blocks.find((b) => b.id === focusedBlockId)?.type === 'paragraph'
                ? 'text-apple-blue font-bold bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
          >
            P
          </button>
          <button
            type="button"
            onClick={() => convertBlockType(focusedBlockId, 'h1')}
            className={`p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs transition-all ${
              blocks.find((b) => b.id === focusedBlockId)?.type === 'h1'
                ? 'text-apple-blue font-bold bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => convertBlockType(focusedBlockId, 'h2')}
            className={`p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs transition-all ${
              blocks.find((b) => b.id === focusedBlockId)?.type === 'h2'
                ? 'text-apple-blue font-bold bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => convertBlockType(focusedBlockId, 'h3')}
            className={`p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs transition-all ${
              blocks.find((b) => b.id === focusedBlockId)?.type === 'h3'
                ? 'text-apple-blue font-bold bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
          >
            H3
          </button>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <button
            type="button"
            onClick={() => convertBlockType(focusedBlockId, 'bullet')}
            className={`p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 ${
              blocks.find((b) => b.id === focusedBlockId)?.type === 'bullet'
                ? 'text-apple-blue bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => convertBlockType(focusedBlockId, 'number')}
            className={`p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 ${
              blocks.find((b) => b.id === focusedBlockId)?.type === 'number'
                ? 'text-apple-blue bg-neutral-200 dark:bg-neutral-800'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
            }`}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>
          <div className="h-4 w-[1px] bg-border mx-1" />
          <button
            type="button"
            onClick={() => convertBlockType(focusedBlockId, 'code')}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark"
            title="Code Block"
          >
            <Code size={16} />
          </button>
          <button
            type="button"
            onClick={() => convertBlockType(focusedBlockId, 'table')}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark"
            title="Table"
          >
            <TableIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => convertBlockType(focusedBlockId, 'image')}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark"
            title="Image"
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => convertBlockType(focusedBlockId, 'embed')}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark"
            title="Site Embed"
          >
            <Globe size={16} />
          </button>

          <button
            type="button"
            onClick={() => deleteBlock(focusedBlockId)}
            disabled={blocks.length <= 1}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-apple-red ml-auto disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Delete block"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Blocks List */}
      <Reorder.Group
        axis="y"
        values={blocks}
        onReorder={handleReorder}
        className="space-y-2 focus:outline-none"
      >
        {blocks.map((block, index) => {
          const isPartnerHere = partnerPresence?.activeBlockId === block.id;

          return (
            <Reorder.Item
              key={block.id}
              value={block}
              className={`flex items-start gap-2 group/block p-1 rounded-apple hover:bg-neutral-50 dark:hover:bg-neutral-900/40 relative ${
                focusedBlockId === block.id ? 'ring-1 ring-apple-blue/20 bg-neutral-50 dark:bg-neutral-900/20' : ''
              }`}
            >
              {/* Drag Handle & Plus sign */}
              <div className="flex items-center mt-1.5 opacity-0 group-hover/block:opacity-100 transition-opacity">
                <div className="cursor-grab active:cursor-grabbing text-neutral-400 p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800">
                  <GripVertical size={16} />
                </div>
              </div>

              {/* Presence Indicator relative to block */}
              {isPartnerHere && (
                <div className="absolute left-[-2px] top-1/2 transform -translate-y-1/2 w-[3px] h-8 bg-apple-green rounded-full shadow-lg" title={`${partnerPresence.userName} is here`} />
              )}

              {/* Block Editor Content */}
              <div className="flex-grow min-w-0 pr-2">
                {renderBlockContent(block, index)}
              </div>

              {/* Partner presence badge */}
              {isPartnerHere && (
                <div className="absolute right-2 top-2 z-10 flex items-center gap-1 bg-apple-green/10 text-apple-green text-[10px] px-1.5 py-0.5 rounded-full border border-apple-green/20 pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-apple-green animate-pulse" />
                  {partnerPresence.userName.split(' ')[0]} {partnerPresence.status === 'editing' ? 'typing...' : 'here'}
                </div>
              )}

              {/* Slash Command floating menu */}
              {slashMenuBlockId === block.id && (
                <div className="absolute left-[36px] top-full mt-1 w-64 bg-white dark:bg-sf-bg-elevatedDark border border-border rounded-apple shadow-apple-lg z-50 p-1 flex flex-col max-h-60 overflow-y-auto">
                  <div className="p-1.5 border-b border-border text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase select-none">
                    Block Commands
                  </div>
                  {filteredSlashItems.length > 0 ? (
                    filteredSlashItems.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => convertBlockType(block.id, item.type as WorkspaceBlock['type'])}
                        className="flex items-center gap-2.5 p-1.5 rounded-apple hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors w-full"
                      >
                        <div className="p-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{item.label}</p>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{item.desc}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-center text-xs text-neutral-400">No results found</div>
                  )}
                </div>
              )}
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* Add Block Trigger at bottom */}
      <div className="flex gap-2 justify-center pt-4 border-t border-dashed border-border mt-4">
        <button
          type="button"
          onClick={() => addBlockAtEnd('paragraph')}
          className="flex items-center gap-1.5 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-apple-blue font-semibold border border-border px-3 py-1.5 rounded-apple hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          <Plus size={14} /> Add Text Block
        </button>
        <button
          type="button"
          onClick={() => addBlockAtEnd('table')}
          className="flex items-center gap-1.5 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-apple-blue font-semibold border border-border px-3 py-1.5 rounded-apple hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          <TableIcon size={14} /> Add Table
        </button>
        <button
          type="button"
          onClick={() => addBlockAtEnd('code')}
          className="flex items-center gap-1.5 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-apple-blue font-semibold border border-border px-3 py-1.5 rounded-apple hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          <Code size={14} /> Add Code Block
        </button>
      </div>
    </div>
  );
}
