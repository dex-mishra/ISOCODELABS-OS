'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import nextDynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import {
  Folder,
  FolderPlus,
  FilePlus,
  ChevronRight,
  ChevronDown,
  FileText,
  Search,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  FolderOpen
} from 'lucide-react';

const TiptapEditor = nextDynamic(() => import('@/components/modules/TiptapEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[300px]">
      <Loader2 className="w-8 h-8 animate-spin text-apple-blue" />
    </div>
  ),
});

export default function WorkspacePage() {
  const { authFetch, user } = useAuth();
  const [folders, setFolders] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<any>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all folders as a tree
  const fetchFolders = useCallback(async () => {
    try {
      const res = await authFetch('/api/workspace/folders');
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err);
    }
  }, [authFetch]);

  // Fetch all loose pages or pages matching query
  const fetchPages = useCallback(async () => {
    try {
      const url = searchQuery
        ? `/api/workspace/pages?search=${encodeURIComponent(searchQuery)}`
        : '/api/workspace/pages';
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (err) {
      console.error('Failed to fetch pages:', err);
    }
  }, [authFetch, searchQuery]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchFolders(), fetchPages()]).finally(() => setLoading(false));
    }
  }, [user, fetchFolders, fetchPages]);

  // Fetch a single page detail
  const selectPage = async (pageId: string) => {
    setPageLoading(true);
    try {
      const res = await authFetch(`/api/workspace/pages/${pageId}`);
      if (res.ok) {
        const data = await res.json();
        setActivePage(data);
        setActivePageId(pageId);
        setSaveStatus(null);
      }
    } catch (err) {
      console.error('Failed to fetch page:', err);
    } finally {
      setPageLoading(false);
    }
  };

  // Auto-save function
  const triggerAutoSave = (updatedFields: { title?: string; content?: any }) => {
    if (!activePageId) return;

    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = {
          title: updatedFields.title !== undefined ? updatedFields.title : activePage.title,
          content: updatedFields.content !== undefined ? updatedFields.content : activePage.content,
        };

        const res = await authFetch(`/api/workspace/pages/${activePageId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setSaveStatus('saved');
          if (updatedFields.title !== undefined) {
            fetchFolders();
            fetchPages();
          }
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    }, 2000);
  };

  const handleTitleChange = (newTitle: string) => {
    if (!activePage) return;
    setActivePage((prev: any) => ({ ...prev, title: newTitle }));
    triggerAutoSave({ title: newTitle });
  };

  const handleContentChange = (newContent: any) => {
    if (!activePage) return;
    setActivePage((prev: any) => ({ ...prev, content: newContent }));
    triggerAutoSave({ content: newContent });
  };

  const handleNewFolder = async (parentId: string | null = null) => {
    const name = prompt('Enter folder name:');
    if (!name) return;

    try {
      const res = await authFetch('/api/workspace/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, parent_id: parentId })
      });

      if (res.ok) {
        fetchFolders();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to create folder');
      }
    } catch (err) {
      console.error('Error creating folder:', err);
    }
  };

  const handleNewPage = async (folderId: string | null = null) => {
    if (creating) return;

    const title = prompt('Enter page title:', 'Untitled');
    if (title === null) return; // User cancelled

    setCreating(true);
    try {
      const body: any = { title: title || 'Untitled' };
      if (folderId) {
        body.folder_id = folderId;
      }

      const res = await authFetch('/api/workspace/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const newPage = await res.json();
        await fetchFolders();
        await fetchPages();
        selectPage(newPage.id);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to create page:', res.status, errData);
        alert(errData.error || `Failed to create page (${res.status})`);
      }
    } catch (err) {
      console.error('Error creating page:', err);
      alert('Network error creating page. Check console.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this folder and all its contents?')) return;

    try {
      const res = await authFetch(`/api/workspace/folders/${folderId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchFolders();
        fetchPages();
        if (activePage && activePage.folder_id === folderId) {
          setActivePage(null);
          setActivePageId(null);
        }
      }
    } catch (err) {
      console.error('Error deleting folder:', err);
    }
  };

  const handleDeletePage = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      const res = await authFetch(`/api/workspace/pages/${pageId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchFolders();
        fetchPages();
        if (activePageId === pageId) {
          setActivePage(null);
          setActivePageId(null);
        }
      }
    } catch (err) {
      console.error('Error deleting page:', err);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const FolderNode = ({ folder, level = 0 }: { folder: any; level: number }) => {
    const isExpanded = !!expandedFolders[folder.id];
    const hasChildren = (folder.children && folder.children.length > 0) || (folder.pages && folder.pages.length > 0);

    return (
      <div className="flex flex-col">
        <div
          onClick={() => toggleFolder(folder.id)}
          className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition hover:bg-sf-border-light/30 dark:hover:bg-zinc-800/50 text-sf-text-light dark:text-zinc-200 group min-w-0"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-sf-text-secondaryLight dark:text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-sf-text-secondaryLight dark:text-zinc-400" />
            ) : (
              <span className="w-3.5" />
            )}
            {isExpanded ? <FolderOpen className="w-4 h-4 text-apple-blue flex-shrink-0" /> : <Folder className="w-4 h-4 text-apple-blue flex-shrink-0" />}
            <span className="text-sm font-medium truncate">{folder.name}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); handleNewPage(folder.id); }}
              className="p-1 rounded hover:bg-sf-border-light/60 dark:hover:bg-zinc-800 text-sf-text-secondaryLight dark:text-zinc-400"
              title="New Page inside"
            >
              <FilePlus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNewFolder(folder.id); }}
              className="p-1 rounded hover:bg-sf-border-light/60 dark:hover:bg-zinc-800 text-sf-text-secondaryLight dark:text-zinc-400"
              title="New Subfolder"
            >
              <FolderPlus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleDeleteFolder(folder.id, e)}
              className="p-1 rounded hover:bg-sf-border-light/60 dark:hover:bg-zinc-800 text-red-500"
              title="Delete Folder"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="flex flex-col">
            {folder.children && folder.children.map((child: any) => (
              <FolderNode key={child.id} folder={child} level={level + 1} />
            ))}
            {folder.pages && folder.pages.map((p: any) => (
              <div
                key={p.id}
                onClick={() => selectPage(p.id)}
                className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition text-sm group min-w-0 ${
                  activePageId === p.id
                    ? 'bg-apple-blue/10 text-apple-blue font-medium'
                    : 'hover:bg-sf-border-light/20 dark:hover:bg-zinc-800/40 text-sf-text-secondaryLight dark:text-zinc-300'
                }`}
                style={{ paddingLeft: `${(level + 1) * 12 + 16}px` }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{p.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeletePage(p.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sf-border-light/60 dark:hover:bg-zinc-800 text-red-500 transition-opacity shrink-0"
                  title="Delete Page"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-sf-text-light dark:text-white">Shared Workspace</h1>
        <p className="text-sm text-sf-text-secondaryLight dark:text-zinc-400 mt-1">
          Collaborative folders and pages with rich-text editor capabilities.
        </p>
      </div>

      <div className="flex-1 flex border border-sf-border-light dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        {/* LEFT PANEL */}
        <div className="w-[280px] border-r border-sf-border-light dark:border-zinc-800 flex flex-col bg-sf-bg-light/30 dark:bg-zinc-950">
          <div className="p-4 border-b border-sf-border-light dark:border-zinc-800 space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNewFolder(null)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sf-bg-light dark:bg-zinc-800 border border-sf-border-light dark:border-zinc-700 rounded-lg hover:bg-sf-border-light/50 dark:hover:bg-zinc-700 transition text-sf-text-light dark:text-white"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                New Folder
              </button>
              <button
                onClick={() => handleNewPage(null)}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-apple-blue hover:bg-apple-blueHover text-white rounded-lg transition disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus className="w-3.5 h-3.5" />}
                New Page
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-sf-text-secondaryLight dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-9 pr-4 py-1.5 bg-sf-bg-light dark:bg-zinc-800 border border-sf-border-light dark:border-zinc-700 rounded-lg focus:outline-none focus:border-apple-blue transition text-sf-text-light dark:text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-apple-blue" />
              </div>
            ) : (
              <>
                {folders.map(f => (
                  <FolderNode key={f.id} folder={f} level={0} />
                ))}

                {pages.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-sf-border-light dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-sf-text-secondaryLight dark:text-zinc-500 px-2 mb-1 uppercase tracking-wider">
                      Pages
                    </p>
                    {pages.map(p => (
                      <div
                        key={p.id}
                        onClick={() => selectPage(p.id)}
                        className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition text-sm group ${
                          activePageId === p.id
                            ? 'bg-apple-blue/10 text-apple-blue font-medium'
                            : 'hover:bg-sf-border-light/20 dark:hover:bg-zinc-800/40 text-sf-text-secondaryLight dark:text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{p.title}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeletePage(p.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sf-border-light/60 dark:hover:bg-zinc-800 text-red-500 transition-opacity"
                          title="Delete Page"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {folders.length === 0 && pages.length === 0 && (
                  <div className="text-center py-8 text-xs text-sf-text-secondaryLight dark:text-zinc-500">
                    No items found.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (EDITOR) */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900">
          {pageLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-apple-blue" />
            </div>
          ) : activePage ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-8 py-4 border-b border-sf-border-light dark:border-zinc-800 flex items-center justify-between bg-sf-bg-light/10 dark:bg-zinc-950/40">
                <input
                  type="text"
                  value={activePage.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-2xl font-bold bg-transparent focus:outline-none border-b border-transparent focus:border-apple-blue/50 pb-0.5 text-sf-text-light dark:text-white w-[70%]"
                  placeholder="Untitled Page"
                />

                <div className="flex items-center gap-2 text-xs">
                  {saveStatus === 'saving' && (
                    <span className="flex items-center gap-1 text-sf-text-secondaryLight dark:text-zinc-400">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-green-500 font-medium">Saved</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="w-3.5 h-3.5" /> Error saving
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <TiptapEditor
                  content={activePage.content}
                  onChange={handleContentChange}
                  placeholder="Start typing your document..."
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <FileText className="w-12 h-12 text-sf-text-secondaryLight dark:text-zinc-500 mb-3" />
              <h3 className="text-base font-semibold text-sf-text-light dark:text-white">No Page Selected</h3>
              <p className="text-sm text-sf-text-secondaryLight dark:text-zinc-400 mt-1 max-w-sm">
                Select a page from the folder hierarchy or create a new page to get started.
              </p>
              <button
                onClick={() => handleNewPage(null)}
                disabled={creating}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-apple-blue hover:bg-apple-blueHover text-white rounded-lg transition shadow-sm disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create New Page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
