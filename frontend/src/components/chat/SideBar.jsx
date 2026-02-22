// frontend/src/components/chat/Sidebar.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Hash, User, Users, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/contexts/WebSocketContext/WebSocketContext';
import { useAuth } from '@/context/authContext'; // 1. Import useAuth

export function Sidebar({ onSelectChat, activeChatId }) {
  const { state,axios: api } = useAuth(); // 2. Access auth state
  const { socket } = useWebSocket();
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastActivity, setLastActivity] = useState({}); 
  const [searchTerm, setSearchTerm] = useState('');
  const currentUserId = state?.user?.id || state?.user?._id || state?.user?.userId;

  // WebSocket Listener
  useEffect(() => {
    // 3. Safety Check: Only listen if socket and user exist
    if (!socket || !state?.user) return;

    const handleNewMsg = (msg) => {
      const senderId = String(msg.sender?._id || msg.sender);
      if (senderId === String(currentUserId)) return;

      const sourceId = msg.isGroupMessage ? msg.team : msg.sender?._id;
      if (!sourceId) return;

      const now = new Date().toISOString();
      setLastActivity(prev => ({ ...prev, [sourceId]: now }));

      if (sourceId !== activeChatId) {
        setUnreadCounts(prev => ({
          ...prev,
          [sourceId]: (prev[sourceId] || 0) + 1
        }));
      }
    };

    socket.on('newMessage', handleNewMsg);
    socket.on('newTeamMessage', handleNewMsg);

    return () => {
      socket.off('newMessage', handleNewMsg);
      socket.off('newTeamMessage', handleNewMsg);
    };
  }, [socket, activeChatId, state?.user, currentUserId]);

  useEffect(() => {
    if (!activeChatId) return;
    setUnreadCounts((prev) => ({ ...prev, [activeChatId]: 0 }));
  }, [activeChatId]);

  // Fetching Data
  const { data: teams = [] } = useQuery({
    queryKey: ['my-teams'],
    queryFn: async () => {
      // Matches your backend exports.getMyTeams
      const { data } = await api.get('/teams/my-teams'); 
      return data;
    },
    enabled: !!state?.user
  });
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      // Matches your backend exports.getConversations
      const { data } = await api.get('/messages/conversations'); 
      return data;
    },
    enabled: !!state?.user
  });
  const { data: companyUsers = [] } = useQuery({
    queryKey: ['users', 'my-company'],
    queryFn: async () => {
      const { data } = await api.get('/users/my-company');
      return data;
    },
    enabled: !!state?.user
  });

  const members = useMemo(() => {
    const conversationMap = new Map(conversations.map((c) => [String(c._id), c]));
    return (companyUsers || [])
      .filter((u) => String(u._id) !== String(currentUserId))
      .map((u) => {
        const existing = conversationMap.get(String(u._id));
        return {
          ...u,
          lastMessage: existing?.lastMessage,
          lastMessageAt: existing?.lastMessage?.createdAt || u.lastMessageAt || null,
          unreadCount: existing?.unreadCount || 0
        };
      });
  }, [companyUsers, conversations, currentUserId]);

  // Sorting Logic
  const sortList = (list) => {
    if (!list) return [];
    return [...list].sort((a, b) => {
      const timeA = new Date(lastActivity[a._id] || a.lastMessageAt || 0);
      const timeB = new Date(lastActivity[b._id] || b.lastMessageAt || 0);
      return timeB - timeA;
    });
  };

  const sortedTeams = useMemo(() => sortList(teams), [teams, lastActivity]);
  const sortedMembers = useMemo(() => sortList(members), [members, lastActivity]);

  // 6. Final safety check: If user is loading, show a placeholder instead of crashing
  if (state.loading) {
    return <div className="p-4 text-zinc-500">Loading conversations...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg mb-4">Messages</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search conversations..." 
            className="pl-8 h-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-6">
          {/* Teams Section */}
          <div>
            <div className="flex items-center gap-2 px-2 mb-2 text-xs font-semibold uppercase text-muted-foreground">
              <Users className="h-3 w-3" /> Teams
            </div>
            <div className="space-y-1">
              {sortedTeams
                .filter(t => t.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((team) => (
                <button
                  key={team._id}
                  onClick={() => onSelectChat('team', team)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left ${activeChatId === team._id ? 'bg-accent border-l-2 border-primary' : ''}`}
                >
                  <Hash className={`h-4 w-4 ${activeChatId === team._id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="truncate flex-1 text-sm font-medium">{team.name}</span>
                  {unreadCounts[team._id] > 0 && (
                    <Badge variant="destructive" className="rounded-full h-5 min-w-[20px] justify-center">{unreadCounts[team._id]}</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Members Section */}
          <div>
            <div className="flex items-center gap-2 px-2 mb-2 text-xs font-semibold uppercase text-muted-foreground">
              <User className="h-3 w-3" /> Direct Messages
            </div>
            <div className="space-y-1">
              {sortedMembers
                .filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((member) => (
                <button
                  key={member._id}
                  onClick={() => onSelectChat('user', member)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left ${activeChatId === member._id ? 'bg-accent border-l-2 border-primary' : ''}`}
                >
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="truncate flex-1 text-sm font-medium">{member.name}</span>
                  {(unreadCounts[member._id] || member.unreadCount) > 0 && (
                    <Badge variant="destructive" className="rounded-full h-5 min-w-[20px] justify-center">
                      {unreadCounts[member._id] || member.unreadCount}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
