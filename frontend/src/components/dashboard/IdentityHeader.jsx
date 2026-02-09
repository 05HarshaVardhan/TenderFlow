// frontend/src/components/dashboard/IdentityHeader.jsx
import React from 'react';
import { Badge } from "@/components/ui/badge";

export default function IdentityHeader({ user }) {
  return (
    <div className="flex items-center gap-4 py-2">
      {/* User Avatar Circle */}
      <div className="h-12 w-12 rounded-full bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold text-xl shrink-0">
        {user?.name?.charAt(0).toUpperCase() || 'U'}
      </div>
      
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.name || 'User'}
          </h1>
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 hover:bg-zinc-800 border-zinc-700 uppercase text-[10px] font-bold">
            {user?.role?.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-zinc-500 text-sm">
          {user?.companyName ? `Managing ${user.companyName}` : 'Company Dashboard Overview'}
        </p>
      </div>
    </div>
  );
}