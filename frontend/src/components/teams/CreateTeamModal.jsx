// src/components/teams/CreateTeamModal.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const teamSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  members: z.array(z.string().email()).min(1, 'At least one member is required'),
});

export function CreateTeamModal({ open, onOpenChange }) {
  const [emails, setEmails] = useState(['']);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(teamSchema),
  });

  const addEmailField = () => setEmails([...emails, '']);
  
  const updateEmail = (index, value) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const removeEmail = (index) => {
    const newEmails = emails.filter((_, i) => i !== index);
    setEmails(newEmails);
  };

  const onSubmit = (data) => {
    // Handle form submission
    console.log({ ...data, members: emails.filter(Boolean) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Team Name
            </label>
            <Input
              {...register('name')}
              className="mt-1"
              placeholder="Enter team name"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Description (Optional)
            </label>
            <Textarea
              {...register('description')}
              className="mt-1"
              placeholder="Enter team description"
              rows={3}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Team Members
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addEmailField}
              >
                Add Member
              </Button>
            </div>
            
            <div className="space-y-2">
              {emails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    placeholder="member@example.com"
                    className="flex-1"
                  />
                  {emails.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeEmail(index)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.members && (
              <p className="text-sm text-red-500 mt-1">
                {errors.members.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Team</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}