// frontend/src/contexts/WebSocketContext/WebSocketContext.jsx
import React, { createContext, useContext } from 'react';
import useWebSocketInternal from './useWebSocket.js'; // Points to your logic file

export const WebSocketContext = createContext(null);

// The Provider component that wraps your App
export const WebSocketProvider = ({ children }) => {
  const socketLogic = useWebSocketInternal();
  
  return (
    <WebSocketContext.Provider value={socketLogic}>
      {children}
    </WebSocketContext.Provider>
  );
};

// The Hook used by Layout.jsx and MessagesPage.jsx
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};