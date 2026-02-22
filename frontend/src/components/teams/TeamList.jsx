// frontend/src/components/teams/TeamList.jsx
import { useState, useEffect } from 'react'; // Added useEffect import
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '@/api/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, UserPlus, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';

export function TeamList() {
  // 1. ALL HOOKS AT THE TOP
  
 const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    retry: 2
  });

  const users = Array.isArray(data) ? data : (data?.users || []);
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    console.log('Users data:', data);
  }, [data]);

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
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Tenders Posted</TableHead>
              <TableHead className="text-right">Bids Submitted</TableHead>
              <TableHead>Member Since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {user.stats?.tendersPosted || 0}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {user.stats?.bidsSubmitted || 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}