import React from 'react';
import Sidebar from '@/components/navigation/Sidebar';

export default function MainLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-black">
      {/* 1. Sidebar remains fixed on the left */}
      <div className="w-64 fixed inset-y-0 z-50">
        <Sidebar />
      </div>
      
      {/* 2. Main content area shifted to the right to account for sidebar width */}
      <main className="flex-1 ml-64 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}