'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamChat } from '@/hooks/useTeamChat';
import ChannelSidebar from '@/components/team-chat/ChannelSidebar';
import MessageFeed from '@/components/team-chat/MessageFeed';
import MessageInput from '@/components/team-chat/MessageInput';
import { ConnectionStatusIndicator } from '@/components/team-chat/ConnectionStatusIndicator';
import { Hash, MessageSquare, ArrowLeft, Menu } from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const {
    channels,
    activeChannel,
    messages,
    connectionStatus,
    hasMore,
    isLoadingMore,
    createChannel,
    selectChannel,
    sendMessage,
    uploadImage,
    loadMoreMessages,
  } = useTeamChat();

  // Responsive: track whether we're showing sidebar or messages on mobile
  const [showSidebar, setShowSidebar] = useState(true);

  const activeChannelData = channels.find((ch) => ch.id === activeChannel);

  const handleSelectChannel = useCallback(
    (id: string) => {
      selectChannel(id);
      // On mobile, switch to message view after selecting
      setShowSidebar(false);
    },
    [selectChannel]
  );

  const handleBackToSidebar = useCallback(() => {
    setShowSidebar(true);
  }, []);

  if (!user) return null;

  return (
    <div className="-m-8 h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* Channel Sidebar — always visible on desktop, conditional on mobile */}
      <div
        className={`${
          showSidebar ? 'flex' : 'hidden'
        } md:flex flex-col min-w-[240px] w-60 shrink-0`}
      >
        <ChannelSidebar
          channels={channels}
          activeId={activeChannel}
          onSelect={handleSelectChannel}
          onCreate={createChannel}
        />
      </div>

      {/* Message Area — always visible on desktop, conditional on mobile */}
      <div
        className={`${
          showSidebar ? 'hidden' : 'flex'
        } md:flex flex-1 flex-col min-w-0 bg-sf-bg-light dark:bg-sf-bg-dark`}
      >
        {activeChannel && activeChannelData ? (
          <>
            {/* Channel Header */}
            <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                {/* Back button on mobile */}
                <button
                  onClick={handleBackToSidebar}
                  className="md:hidden p-1.5 rounded-lg hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-secondaryLight dark:text-sf-text-secondaryDark transition-colors"
                  aria-label="Back to channels"
                >
                  <ArrowLeft size={18} />
                </button>

                <Hash size={16} className="text-apple-blue shrink-0" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground truncate">
                  {activeChannelData.name}
                </h2>
              </div>

              <ConnectionStatusIndicator status={connectionStatus} />
            </div>

            {/* Message Feed */}
            <MessageFeed
              messages={messages}
              currentUserId={user.id}
              hasMore={hasMore}
              onLoadMore={loadMoreMessages}
              isLoadingMore={isLoadingMore}
            />

            {/* Message Input */}
            <MessageInput
              onSend={sendMessage}
              onUploadImage={uploadImage}
            />
          </>
        ) : (
          /* Welcome State — no channel selected */
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            {/* Back button on mobile when in welcome state */}
            <button
              onClick={handleBackToSidebar}
              className="md:hidden absolute top-4 left-4 p-1.5 rounded-lg hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-secondaryLight dark:text-sf-text-secondaryDark transition-colors"
              aria-label="Back to channels"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="p-4 bg-apple-blue/10 rounded-2xl mb-4">
              <MessageSquare size={32} className="text-apple-blue" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1">
              Team Chat
            </h2>
            <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark max-w-sm">
              {channels.length === 0
                ? 'No channels yet. Create one to start chatting with your co-founder.'
                : 'Select a channel or create one to start chatting.'}
            </p>

            {channels.length === 0 && (
              <p className="mt-4 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                Use the sidebar to create your first channel.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
