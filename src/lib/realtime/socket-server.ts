import { Server as IOServer, Socket } from 'socket.io';
import { verifyToken } from '../auth/jwt';

// Presence map: channelName -> Map of socketId -> User Presence details
const presenceMap = new Map<
  string,
  Map<
    string,
    {
      userId: string;
      userName: string;
      avatarUrl?: string | null;
      status: 'viewing' | 'editing';
      activeBlockId?: string | null;
    }
  >
>();

export function initSocketServer(io: IOServer) {
  // 1. JWT Authentication Middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Authentication error: Token invalid'));
      }

      // Attach user payload to socket data
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: ' + (err as Error).message));
    }
  });

  // 2. Connection Handler
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    // Join user to their own private room for direct notifications
    socket.join(`user:${user.id}`);
    console.log(`🔌 Socket connected: ${socket.id} (User: ${user.email})`);

    // --- Channel Join & Leave ---
    socket.on('join-channel', (channelName: string) => {
      socket.join(channelName);
      console.log(`📢 Socket ${socket.id} joined channel: ${channelName}`);
    });

    socket.on('leave-channel', (channelName: string) => {
      socket.leave(channelName);
      console.log(`📢 Socket ${socket.id} left channel: ${channelName}`);

      // Clean up presence in this channel
      if (presenceMap.has(channelName)) {
        const channelPresence = presenceMap.get(channelName)!;
        if (channelPresence.has(socket.id)) {
          channelPresence.delete(socket.id);
          io.to(channelName).emit('presence:update', Array.from(channelPresence.values()));
        }
      }
    });

    // --- Presence Management ---
    socket.on(
      'presence:join',
      ({
        channel,
        status,
        activeBlockId,
      }: {
        channel: string;
        status?: 'viewing' | 'editing';
        activeBlockId?: string;
      }) => {
        if (!channel) return;

        socket.join(channel);

        if (!presenceMap.has(channel)) {
          presenceMap.set(channel, new Map());
        }

        const channelPresence = presenceMap.get(channel)!;
        channelPresence.set(socket.id, {
          userId: user.id,
          userName: user.name,
          avatarUrl: user.avatar_url || null,
          status: status || 'viewing',
          activeBlockId: activeBlockId || null,
        });

        // Broadcast updated presence list for this channel
        io.to(channel).emit('presence:update', Array.from(channelPresence.values()));
      }
    );

    socket.on(
      'presence:status',
      ({
        channel,
        status,
        activeBlockId,
      }: {
        channel: string;
        status: 'viewing' | 'editing';
        activeBlockId?: string;
      }) => {
        if (!channel || !presenceMap.has(channel)) return;

        const channelPresence = presenceMap.get(channel)!;
        if (channelPresence.has(socket.id)) {
          const info = channelPresence.get(socket.id)!;
          info.status = status;
          info.activeBlockId = activeBlockId || null;

          io.to(channel).emit('presence:update', Array.from(channelPresence.values()));
        }
      }
    );

    // --- Team Chat Events ---
    socket.on('team-chat:join', ({ channelId }: { channelId: string }) => {
      if (!channelId) return;
      const room = `team-channel:${channelId}`;
      socket.join(room);
      console.log(`💬 Socket ${socket.id} joined team-chat room: ${room}`);
    });

    socket.on('team-chat:leave', ({ channelId }: { channelId: string }) => {
      if (!channelId) return;
      const room = `team-channel:${channelId}`;
      socket.leave(room);
      console.log(`💬 Socket ${socket.id} left team-chat room: ${room}`);
    });

    socket.on('team-chat:typing', ({ channelId, isTyping }: { channelId: string; isTyping: boolean }) => {
      if (!channelId) return;
      const room = `team-channel:${channelId}`;
      socket.to(room).emit('team-chat:typing', {
        channelId,
        userId: user.id,
        userName: user.name,
        isTyping,
      });
    });

    // --- Legacy / Backward Compatibility Support (Steps 1-8) ---
    socket.on('join-room', (roomName: string) => {
      socket.join(roomName);
      console.log(`📢 Socket ${socket.id} joined legacy room: ${roomName}`);
    });

    socket.on('workspace:page:edit', (payload: { pageId: string; blocks: any[]; senderId: string }) => {
      // Legacy code forwards to "workspace:page:{pageId}"
      socket.to(`workspace:page:${payload.pageId}`).emit('workspace:page:edit', payload);
    });

    socket.on(
      'workspace:page:presence',
      (payload: { pageId: string; userId: string; userName: string; status: 'viewing' | 'editing' }) => {
        // Legacy code forwards presence to "workspace:page:{pageId}"
        socket.to(`workspace:page:${payload.pageId}`).emit('workspace:page:presence', payload);
      }
    );

    // --- Disconnect Cleanup ---
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      // Clean up presence in all channels
      presenceMap.forEach((channelPresence, channel) => {
        if (channelPresence.has(socket.id)) {
          channelPresence.delete(socket.id);
          io.to(channel).emit('presence:update', Array.from(channelPresence.values()));
        }
      });
    });
  });
}
