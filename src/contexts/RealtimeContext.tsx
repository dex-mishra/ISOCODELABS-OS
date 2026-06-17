'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface RealtimeContextType {
  socket: Socket | null;
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!user) {
      setSocket((prevSocket) => {
        if (prevSocket) {
          prevSocket.disconnect();
        }
        return null;
      });
      setConnected(false);
      return;
    }

    let socketInstance: Socket | null = null;

    // Ping the api/socket endpoint to initialize the socket server in Next.js
    fetch('/api/socket')
      .then(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
        socketInstance = io(socketUrl, {
          path: '/api/socket',
          transports: ['websocket', 'polling'],
        });

        socketInstance.on('connect', () => {
          setConnected(true);
        });

        socketInstance.on('disconnect', () => {
          setConnected(false);
        });

        setSocket(socketInstance);
      })
      .catch((err) => {
        console.error('Failed to initialize Socket.io client:', err);
      });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user]);

  return (
    <RealtimeContext.Provider value={{ socket, connected }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
