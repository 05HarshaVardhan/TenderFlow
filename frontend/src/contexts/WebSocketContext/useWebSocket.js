// frontend/src/contexts/WebSocketContext/useWebSocket.js
import { useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/authContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const useWebSocket = () => {
  const { state } = useAuth(); // Access user and token from state
  const socketRef = useRef(null);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!state.user || !state.token) return null;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
      auth: { token: state.token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    socket.on('newMessage', (message) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      if (document.hidden) {
        toast.message('New message', {
          description: message.content,
        });
      }
    });
    socket.on('newTeamMessage', () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    });

    socket.on('typing', ({ userId, isTyping }) => {
      console.log(`User ${userId} is ${isTyping ? 'typing...' : 'not typing'}`);
    });

    socketRef.current = socket;
    return socket;
  }, [state.user, state.token, queryClient]);

  useEffect(() => {
    const socket = connect();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((messageData) => {
    if (!socketRef.current) return;
    if (messageData?.isGroupMessage && messageData.teamId) {
      socketRef.current.emit('sendTeamMessage', {
        teamId: messageData.teamId,
        content: messageData.content,
      });
      return;
    }
    const recipientId = messageData?.recipients?.[0];
    if (recipientId) {
      socketRef.current.emit('privateMessage', {
        recipientId,
        content: messageData.content,
      });
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    sendMessage,
  };
};

export default useWebSocket; // This is the default export needed by WebSocketContext.jsx
