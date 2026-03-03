// frontend/src/components/teams/TeamList.jsx
import { useState, useEffect } from 'react'; // Added useEffect import
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blockUser, deleteUser, getUsers, unblockUser } from '@/api/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ban, CheckCircle2, Search, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/authContext';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/ConfirmDialog';

export function TeamList() {
  // 1. ALL HOOKS AT THE TOP
  const queryClient = useQueryClient();
  const { state } = useAuth();
  const canManageUsers = ['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(state.user?.role);
  const isSuperAdmin = state.user?.role === 'SUPER_ADMIN';
  
 const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    retry: 2
  });

  const users = Array.isArray(data) ? data : (data?.users || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    mode: null,
    user: null,
    title: '',
    description: '',
  });
  useEffect(() => {
    console.log('Users data:', data);
  }, [data]);

  const blockMutation = useMutation({
    mutationFn: blockUser,
    onSuccess: (response) => {
      toast.success(response?.message || 'User blocked successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to block user');
    }
  });

  const unblockMutation = useMutation({
    mutationFn: unblockUser,
    onSuccess: (response) => {
      toast.success(response?.message || 'User unblocked successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to unblock user');
    }
  });

  const removeMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: (response) => {
      toast.success(response?.message || 'User removed successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to remove user');
    }
  });

  // 2. CONDITIONAL RENDERING AFTER HOOKS
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error! </strong>
        <span className="block sm:inline">Failed to load team members. {error.message}</span>
      </div>
    );
  }

  // 3. LOGIC & TRANSFORMATION
  const filteredUsers = users.filter(user => {
    // Add optional chaining here to prevent crashes if name/email is missing
    const name = user?.name?.toLowerCase() || "";
    const email = user?.email?.toLowerCase() || "";
    const role = user?.role?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    
    return name.includes(search) || email.includes(search) || role.includes(search);
  });

  const getRoleBadge = (role) => {
    const roleMap = {
      'COMPANY_ADMIN': { label: 'Admin', variant: 'default' },
      'TENDER_POSTER': { label: 'Tender Poster', variant: 'secondary' },
      'BIDDER': { label: 'Bidder', variant: 'outline' },
      'AUDITOR': { label: 'Auditor', variant: 'outline' }
    };
    const { label, variant } = roleMap[role] || { label: role, variant: 'outline' };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const isBusy = blockMutation.isPending || unblockMutation.isPending || removeMutation.isPending;

  const handleBlockToggle = (user) => {
    if (!canManageUsers) return;
    if (user._id === state.user?.id) {
      toast.error('You cannot block your own account');
      return;
    }

    const willBlock = user.isActive;
    setConfirmDialog({
      open: true,
      mode: willBlock ? 'block' : 'unblock',
      user,
      title: willBlock ? `Block ${user.name}?` : `Unblock ${user.name}?`,
      description: willBlock
        ? 'They will be notified by email and cannot access the platform.'
        : 'They will be notified by email and can access the platform again.',
    });
  };

  const handleRemove = (user) => {
    if (!canManageUsers) return;
    if (user._id === state.user?.id) {
      toast.error('You cannot remove your own account');
      return;
    }

    setConfirmDialog({
      open: true,
      mode: 'remove',
      user,
      title: `Remove ${user.name}?`,
      description: 'This action is permanent. They will be notified by email before removal.',
    });
  };

  const onConfirmAction = () => {
    if (!confirmDialog.user?._id || !confirmDialog.mode) return;

    if (confirmDialog.mode === 'block') {
      blockMutation.mutate(confirmDialog.user._id);
    } else if (confirmDialog.mode === 'unblock') {
      unblockMutation.mutate(confirmDialog.user._id);
    } else {
      removeMutation.mutate(confirmDialog.user._id);
    }

    setConfirmDialog({ open: false, mode: null, user: null, title: '', description: '' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Team Members</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search team members..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              {isSuperAdmin && <TableHead>Company</TableHead>}
              <TableHead>Role</TableHead>
              <TableHead>Member Since</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 5 : 4} className="h-24 text-center">
                  {searchTerm ? 'No matching users found' : 'No team members yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell className="text-muted-foreground">
                      {user.company?.name || 'Unassigned'}
                    </TableCell>
                  )}
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!user.isActive && (
                        <Badge variant="outline" className="border-red-300 text-red-600">
                          Blocked
                        </Badge>
                      )}
                      {canManageUsers ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy || user._id === state.user?.id}
                            onClick={() => handleBlockToggle(user)}
                          >
                            {user.isActive ? (
                              <>
                                <Ban className="h-4 w-4 mr-1" />
                                Block
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Unblock
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isBusy || user._id === state.user?.id}
                            onClick={() => handleRemove(user)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Admin only</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, mode: null, user: null, title: '', description: '' });
          }
        }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.mode === 'remove' ? 'Remove' : confirmDialog.mode === 'block' ? 'Block' : 'Unblock'}
        confirmVariant={confirmDialog.mode === 'remove' ? 'destructive' : 'default'}
        onConfirm={onConfirmAction}
        isLoading={isBusy}
      />
    </Card>
  );
}
