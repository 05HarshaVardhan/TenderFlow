import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '../contexts/WebSocketContext/WebSocketContext';
import { useAuth } from '@/context/authContext';
import { useEffect } from 'react';

export const useChat = (recipientId, teamId) => {
  const { sendMessage } = useWebSocket();
  const { axios: api, state } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = state?.user?.id || state?.user?._id || state?.user?.userId;

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', teamId || recipientId],
    queryFn: async () => {
      const params = teamId ? { teamId } : { otherUserId: recipientId };
      const { data } = await api.get('/messages', { params });
      return data;
    },
    enabled: !!(teamId || recipientId),
  });

  useEffect(() => {
    const markRead = async () => {
      if (!messages.length || !currentUserId) return;
      const unreadIds = messages
        .filter((m) => String(m.sender?._id) !== String(currentUserId))
        .filter((m) => !Array.isArray(m.readBy) || !m.readBy.some((r) => String(r.user) === String(currentUserId)))
        .map((m) => m._id);

      if (!unreadIds.length) return;

      await api.put('/messages/read', { messageIds: unreadIds });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    markRead().catch(() => {});
  }, [messages, currentUserId, api, queryClient]);

  // Function to send a message
  const handleSendMessage = (content) => {
    if (!content.trim()) return;

    const messageData = {
      content,
      isGroupMessage: !!teamId,
      teamId: teamId || null,
      recipients: teamId ? [] : [recipientId],
    };

    sendMessage(messageData);
  };

  return { messages, isLoading, handleSendMessage };
};
