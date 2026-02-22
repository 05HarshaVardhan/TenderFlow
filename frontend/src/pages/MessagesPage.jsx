// frontend/src/pages/MessagesPage.jsx
import React, { useState } from 'react';
import { Sidebar } from '@/components/chat/SideBar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { MessageSquareDashed } from 'lucide-react';

export default function MessagesPage() {
  const [activeChat, setActiveChat] = useState(null); // Structure: { type: 'user' | 'team', data: object }

  const handleSelectChat = (type, data) => {
    setActiveChat({ type, data });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* 1. Sidebar Container */}
      <aside className="w-80 border-r flex-shrink-0">
        <Sidebar 
          onSelectChat={handleSelectChat} 
          activeChatId={activeChat?.data?._id} 
        />
      </aside>

      {/* 2. Chat Window Container */}
      <main className="flex-1 flex flex-col min-w-0 bg-muted/5">
        {activeChat ? (
          <div className="flex-1 p-4 lg:p-6">
            <ChatWindow 
              targetUser={activeChat.type === 'user' ? activeChat.data : null}
              targetTeam={activeChat.type === 'team' ? activeChat.data : null}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquareDashed className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">Your Messages</h3>
            <p className="text-muted-foreground max-w-xs mt-2">
              Select a team or a colleague from the sidebar to start a conversation.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
