'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';

export interface TeamChannel {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  memberCount: number;
}

export interface TeamMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  images: string[];
  created_at: string;
  sender: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export function useTeamChat() {
  const { authFetch, user } = useAuth();
  const { socket } = useRealtime();

  const [channels, setChannels] = useState<TeamChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const previousChannelRef = useRef<string | null>(null);

  // Fetch channels on mount
  useEffect(() => {
    if (!user) return;

    const fetchChannels = async () => {
      try {
        const res = await authFetch('/api/team-chat/channels');
        if (res.ok) {
          const data = await res.json();
          setChannels(data);
        }
      } catch (error) {
        console.error('Failed to fetch channels:', error);
      }
    };

    fetchChannels();
  }, [user, authFetch]);

  // Socket.io connection status
  useEffect(() => {
    if (!socket) {
      setConnectionStatus('disconnected');
      return;
    }

    const handleConnect = () => setConnectionStatus('connected');
    const handleDisconnect = () => setConnectionStatus('disconnected');
    const handleReconnectAttempt = () => setConnectionStatus('reconnecting');

    // Set initial status
    if (socket.connected) {
      setConnectionStatus('connected');
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, [socket]);

  // Listen for incoming messages on the active channel
  useEffect(() => {
    if (!socket || !activeChannel) return;

    const handleNewMessage = (message: TeamMessage) => {
      if (message.channel_id === activeChannel) {
        setMessages((prev) => {
          // Avoid duplicates (e.g., from optimistic update)
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    socket.on('team-chat:message', handleNewMessage);

    return () => {
      socket.off('team-chat:message', handleNewMessage);
    };
  }, [socket, activeChannel]);

  // Create a new channel
  const createChannel = useCallback(
    async (name: string) => {
      try {
        const res = await authFetch('/api/team-chat/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        if (res.ok) {
          // Refetch channels list
          const channelsRes = await authFetch('/api/team-chat/channels');
          if (channelsRes.ok) {
            const data = await channelsRes.json();
            setChannels(data);
          }
        } else {
          const error = await res.json();
          throw new Error(error.error || 'Failed to create channel');
        }
      } catch (error) {
        console.error('Failed to create channel:', error);
        throw error;
      }
    },
    [authFetch]
  );

  // Select a channel
  const selectChannel = useCallback(
    async (id: string) => {
      // Leave previous channel room
      if (previousChannelRef.current && socket) {
        socket.emit('team-chat:leave', { channelId: previousChannelRef.current });
      }

      setActiveChannel(id);
      previousChannelRef.current = id;
      setMessages([]);
      setHasMore(false);

      // Join new channel room
      if (socket) {
        socket.emit('team-chat:join', { channelId: id });
      }

      // Fetch messages for the channel
      try {
        const res = await authFetch(`/api/team-chat/channels/${id}/messages`);
        if (res.ok) {
          const data = await res.json();
          // Messages come in desc order from API, reverse to show oldest first
          setMessages(data.messages.reverse());
          setHasMore(data.hasMore);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }

      // Mark channel as read
      try {
        await authFetch(`/api/team-chat/channels/${id}/read`, {
          method: 'PATCH',
        });
      } catch (error) {
        console.error('Failed to mark channel as read:', error);
      }
    },
    [authFetch, socket]
  );

  // Send a message with optimistic update
  const sendMessage = useCallback(
    async (content: string, images?: string[]) => {
      if (!activeChannel || !user) return;

      // Optimistic message
      const optimisticMessage: TeamMessage = {
        id: `optimistic-${Date.now()}`,
        channel_id: activeChannel,
        sender_id: user.id,
        content,
        images: images || [],
        created_at: new Date().toISOString(),
        sender: {
          id: user.id,
          name: user.name,
          avatar_url: user.avatar_url || null,
        },
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const res = await authFetch(
          `/api/team-chat/channels/${activeChannel}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, images: images || [] }),
          }
        );

        if (res.ok) {
          const savedMessage = await res.json();
          // Replace optimistic message with the real one
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticMessage.id ? savedMessage : m))
          );
        } else {
          // Remove optimistic message on failure
          setMessages((prev) =>
            prev.filter((m) => m.id !== optimisticMessage.id)
          );
          const error = await res.json();
          throw new Error(error.error || 'Failed to send message');
        }
      } catch (error) {
        // Remove optimistic message on network failure
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticMessage.id)
        );
        console.error('Failed to send message:', error);
        throw error;
      }
    },
    [activeChannel, user, authFetch]
  );

  // Upload an image
  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await authFetch('/api/team-chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return data.url;
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload image');
      }
    },
    [authFetch]
  );

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!activeChannel || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      // Use the oldest message ID as cursor
      const oldestMessage = messages[0];
      if (!oldestMessage) {
        setIsLoadingMore(false);
        return;
      }

      const res = await authFetch(
        `/api/team-chat/channels/${activeChannel}/messages?cursor=${oldestMessage.id}`
      );

      if (res.ok) {
        const data = await res.json();
        // Prepend older messages (they come in desc order, reverse to chronological)
        setMessages((prev) => [...data.messages.reverse(), ...prev]);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeChannel, hasMore, isLoadingMore, messages, authFetch]);

  // Mark channel as read
  const markAsRead = useCallback(
    async (channelId: string) => {
      try {
        await authFetch(`/api/team-chat/channels/${channelId}/read`, {
          method: 'PATCH',
        });
      } catch (error) {
        console.error('Failed to mark channel as read:', error);
      }
    },
    [authFetch]
  );

  return {
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
    markAsRead,
  };
}
