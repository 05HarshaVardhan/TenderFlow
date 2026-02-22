// src/components/teams/TeamsPage.jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TeamList } from './TeamList';
import { CreateTeamModal } from './CreateTeamModal';
import { CreateUserForm } from './CreateUserForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function TeamsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Team Management</h1>
        <div className="flex gap-2">
          <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Team Member</DialogTitle>
              </DialogHeader>
              <CreateUserForm onSuccess={() => setIsUserModalOpen(false)} />
            </DialogContent>
          </Dialog>
          
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
        
        <TabsContent value="members" className="mt-6">
          <TeamList />
        </TabsContent>
        
        <TabsContent value="teams" className="mt-6">
          <div className="p-4 border rounded-lg">
            <p className="text-muted-foreground">Teams functionality coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
      
      <CreateTeamModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
    </div>
  );
}