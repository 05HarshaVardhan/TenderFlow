// frontend/src/components/dashboard/IdentityHeader.jsx
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Trash2 } from "lucide-react";

export default function IdentityHeader({ user, onUploadPhoto, onRemovePhoto, uploadingProfileImage }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2">
      {/* User Avatar Circle */}
      <div className="relative h-24 w-24 shrink-0">
        <div className="h-24 w-24 rounded-full bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold text-4xl overflow-hidden">
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={user?.name || 'User'}
              className="h-full w-full object-cover"
            />
          ) : (
            user?.name?.charAt(0).toUpperCase() || 'U'
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              disabled={uploadingProfileImage}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
              title="Edit profile photo"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onSelect={() => {
                setTimeout(() => onUploadPhoto?.(), 0);
              }}
            >
              {user?.profileImageUrl ? 'Change photo' : 'Upload photo'}
            </DropdownMenuItem>
            {user?.profileImageUrl && (
              <DropdownMenuItem
                onSelect={onRemovePhoto}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove photo
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
