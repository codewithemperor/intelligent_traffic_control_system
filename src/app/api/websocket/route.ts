import { NextRequest } from 'next/server';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';

export type NextApiResponseServerIO = NextRequest & {
  socket: {
    server: NetServer & {
      io?: ServerIO;
    };
  };
};

const SocketHandler = (req: NextApiResponseServerIO, res: any) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket',
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3001'],
        methods: ['GET', 'POST']
      }
    });
    
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join traffic control room
      socket.join('traffic-control');

      // Handle traffic light updates
      socket.on('traffic-light-update', (data) => {
        socket.to('traffic-control').emit('traffic-light-changed', data);
      });

      // Handle vehicle count updates
      socket.on('vehicle-count-update', (data) => {
        socket.to('traffic-control').emit('vehicle-count-changed', data);
      });

      // Handle system alerts
      socket.on('system-alert', (data) => {
        socket.to('traffic-control').emit('system-alert', data);
      });

      // Handle performance updates
      socket.on('performance-update', (data) => {
        socket.to('traffic-control').emit('performance-updated', data);
      });

      // Handle manual override requests
      socket.on('manual-override', (data) => {
        socket.to('traffic-control').emit('manual-override-requested', data);
      });

      // Handle emergency mode activation
      socket.on('emergency-mode', (data) => {
        socket.to('traffic-control').emit('emergency-mode-activated', data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Set up periodic status broadcasts
    setInterval(() => {
      io.to('traffic-control').emit('heartbeat', {
        timestamp: new Date().toISOString(),
        connectedClients: io.sockets.sockets.size
      });
    }, 30000); // Every 30 seconds
  }

  res.end();
};

export default SocketHandler;