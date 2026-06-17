import { NextApiRequest, NextApiResponse } from 'next';
import { Server as IOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Socket as NetSocket } from 'net';
import { initSocketServer } from '@/lib/realtime/socket-server';

interface SocketServer extends HTTPServer {
  io?: IOServer;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const io = new IOServer(res.socket.server as any, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
    },
  });

  res.socket.server.io = io;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).io = io; // Attach globally for access in App Router API routes

  // Initialize socket connections, room channels, JWT auth, and presence
  initSocketServer(io);

  res.end();
}
