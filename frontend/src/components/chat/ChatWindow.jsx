// frontend/src/components/chat/ChatWindow.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, User as UserIcon, Loader2 } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '../../context/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatWindow({ targetUser, targetTeam }) {
  const [input, setInput] = useState('');
  const { state } = useAuth();
  const scrollRef = useRef(null);
  const currentUserId = state?.user?.id || state?.user?._id || state?.user?.userId;
  
  const { messages, handleSendMessage, isLoading } = useChat(
    targetUser?._id,
    targetTeam?._id
  );

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const onSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full border rounded-lg bg-background relative">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          {targetTeam ? <Hash className="h-5 w-5 text-primary" /> : <UserIcon className="h-5 w-5 text-primary" />}
          <div>
            <p className="font-semibold leading-none">{targetTeam?.name || targetUser?.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {targetTeam ? 'Team Channel' : 'Direct Message'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMe = String(msg.sender?._id) === String(currentUserId);
              return (
                <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl ${
                    isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'
                  }`}>
                    {!isMe && targetTeam && (
                      <p className="text-[10px] font-bold mb-1 uppercase tracking-tight opacity-70">
                        {msg.sender.name}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <span className={`text-[9px] block mt-1 text-right opacity-60`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <form onSubmit={onSend} className="p-4 border-t flex gap-2 bg-card">
        <Input
          placeholder="Write a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
