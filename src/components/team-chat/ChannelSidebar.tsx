'use client';

import React, { useState, useCallback } from 'react';
import { Hash, Plus, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';

interface Channel {
  id: string;
  name: string;
  memberCount: number;
}

interface ChannelSidebarProps {
  channels: Channel[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
}

const MAX_CHANNEL_NAME = 50;

export default function ChannelSidebar({ channels, activeId, onSelect, onCreate }: ChannelSidebarProps) {
  const [newChannelName, setNewChannelName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Sort channels alphabetically (case-insensitive)
  const sortedChannels = [...channels].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  const validateName = (name: string): string | null => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return 'Channel name cannot be empty';
    }
    if (trimmed.length > MAX_CHANNEL_NAME) {
      return `Channel name must be ${MAX_CHANNEL_NAME} characters or fewer`;
    }
    return null;
  };

  const handleCreate = useCallback(async () => {
    const validationError = validateName(newChannelName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      await onCreate(newChannelName.trim());
      setNewChannelName('');
    } catch (err: any) {
      setError(err?.message || 'Failed to create channel');
    } finally {
      setIsCreating(false);
    }
  }, [newChannelName, onCreate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewChannelName(e.target.value);
    // Clear error when user starts typing again
    if (error) setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <aside className="min-w-[240px] w-60 h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <MessageSquare size={18} className="text-apple-blue shrink-0" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Channels</h2>
      </div>

      {/* Create Channel Section */}
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newChannelName}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isCreating}
            placeholder="New channel name"
            maxLength={MAX_CHANNEL_NAME + 10}
            className="flex-1 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue text-foreground placeholder:text-sf-text-secondaryLight/60 transition-all disabled:opacity-50"
          />
          <button
            onClick={handleCreate}
            disabled={isCreating}
            title="Create channel"
            className="p-1.5 bg-apple-blue text-white rounded-lg hover:bg-apple-blueHover disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <Plus size={14} />
          </button>
        </div>
        {error && (
          <p className="mt-1.5 text-[11px] text-red-500 font-medium leading-tight">{error}</p>
        )}
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {sortedChannels.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
              No channels yet. Create one above.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 px-1.5">
            {sortedChannels.map((channel) => {
              const isActive = channel.id === activeId;
              return (
                <li key={channel.id}>
                  <button
                    onClick={() => onSelect(channel.id)}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all',
                      'hover:bg-border/40',
                      isActive
                        ? 'bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue font-medium'
                        : 'text-foreground'
                    )}
                  >
                    <Hash
                      size={14}
                      className={clsx(
                        'shrink-0',
                        isActive
                          ? 'text-apple-blue'
                          : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
                      )}
                    />
                    <span className="text-sm truncate">{channel.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
