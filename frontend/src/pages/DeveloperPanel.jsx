import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Bell, Clock3, Cpu, Database, HardDrive, Users, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/api/axios';
import { blockUser, deleteUser, unblockUser } from '@/api/user';
import { createCompany, deleteCompany, getAllCompanies, getUsersByCompany } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConfirmDialog from '@/components/ConfirmDialog';

const formatDuration = (totalSec = 0) => {
  const sec = Number(totalSec) || 0;
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

const metricCard = (label, value, icon, tone = 'text-zinc-200') => {
  const Icon = icon;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
};

export default function DeveloperPanel() {
  const queryClient = useQueryClient();
  const [newCompany, setNewCompany] = useState({
    name: '',
    emailDomain: '',
    industry: '',
  });
  const [deleteCompanyDialog, setDeleteCompanyDialog] = useState({
    open: false,
    companyId: null,
    companyName: '',
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['developer-monitor'],
    queryFn: async () => {
      const response = await api.get('/developer/monitor');
      return response.data;
    },
    refetchInterval: 20000
  });

  const { data: usersByCompanyData, isLoading: usersByCompanyLoading } = useQuery({
    queryKey: ['admin-users-by-company'],
    queryFn: getUsersByCompany,
  });

  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: getAllCompanies,
  });

  const blockMutation = useMutation({
    mutationFn: blockUser,
    onSuccess: (res) => {
      toast.success(res?.message || 'User blocked');
      queryClient.invalidateQueries({ queryKey: ['admin-users-by-company'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to block user'),
  });

  const unblockMutation = useMutation({
    mutationFn: unblockUser,
    onSuccess: (res) => {
      toast.success(res?.message || 'User unblocked');
      queryClient.invalidateQueries({ queryKey: ['admin-users-by-company'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to unblock user'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: (res) => {
      toast.success(res?.message || 'User removed');
      queryClient.invalidateQueries({ queryKey: ['admin-users-by-company'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to remove user'),
  });

  const createCompanyMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: (res) => {
      toast.success(res?.message || 'Company created');
      setNewCompany({ name: '', emailDomain: '', industry: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-by-company'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to create company'),
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: (res) => {
      toast.success(res?.message || 'Company removed');
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-by-company'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to remove company'),
  });

  const usersGrouped = useMemo(() => usersByCompanyData?.companies || [], [usersByCompanyData]);
  const companies = useMemo(() => companiesData?.companies || [], [companiesData]);

  const onCreateCompany = (event) => {
    event.preventDefault();
    createCompanyMutation.mutate({
      name: newCompany.name,
      emailDomain: newCompany.emailDomain,
      industry: newCompany.industry,
    });
  };

  const onDeleteCompany = (companyId, companyName) => {
    setDeleteCompanyDialog({
      open: true,
      companyId,
      companyName,
    });
  };

  const onToggleUserBlock = (user) => {
    if (user.isActive) {
      blockMutation.mutate(user._id);
      return;
    }
    unblockMutation.mutate(user._id);
  };

  if (isLoading) {
    return <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-400">Loading developer monitor...</div>;
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-red-300">
        Failed to load developer panel data: {error?.response?.data?.message || error.message}
      </div>
    );
  }

  const runtime = data?.runtime || {};
  const entities = data?.entities || {};
  const trends24h = data?.trends24h || {};
  const tenderInsights = data?.tenderInsights || {};
  const bidInsights = data?.bidInsights || {};
  const recent = data?.recent || { tenders: [], bids: [] };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Developer Panel</h2>
            <p className="text-sm text-zinc-400">
              Scope: {data?.scope} | Last refresh: {new Date(data?.generatedAt).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-300">
            Node {runtime?.nodeVersion} | {runtime?.env} | Monitoring {runtime?.monitoring?.provider || 'none'} {runtime?.monitoring?.enabled ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCard('Total Tenders', entities.totalTenders || 0, Database)}
        {metricCard('Total Bids', entities.totalBidsPlaced || 0, Activity)}
        {metricCard('Total Users', entities.totalUsers || 0, Users)}
        {metricCard('Unread Notifications', entities.unreadNotifications || 0, Bell, 'text-amber-300')}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCard('Uptime', formatDuration(runtime.uptimeSec), Clock3)}
        {metricCard('Heap Used (MB)', runtime?.memory?.heapUsedMb ?? 0, HardDrive)}
        {metricCard('Active Users', entities.activeUsers || 0, Users, 'text-emerald-300')}
        {metricCard('Expiring Soon (7d)', tenderInsights.expiringSoon || 0, Cpu, 'text-orange-300')}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Tender Status Breakdown</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(tenderInsights.statusBreakdown || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                <span className="text-zinc-400">{status}</span>
                <span className="font-semibold text-zinc-100">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Bid Status Breakdown</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(bidInsights.statusBreakdown || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                <span className="text-zinc-400">{status}</span>
                <span className="font-semibold text-zinc-100">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Last 24 Hours</h3>
          <div className="grid grid-cols-3 gap-3">
            {metricCard('New Users', trends24h.newUsers24h || 0, Users)}
            {metricCard('New Tenders', trends24h.newTenders24h || 0, Database)}
            {metricCard('New Bids', trends24h.newBids24h || 0, Activity)}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Runtime Load</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
              <span className="text-zinc-400">CPU Load (1m)</span>
              <span className="font-semibold text-zinc-100">{runtime?.cpuLoadAvg?.oneMin ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
              <span className="text-zinc-400">CPU Load (5m)</span>
              <span className="font-semibold text-zinc-100">{runtime?.cpuLoadAvg?.fiveMin ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
              <span className="text-zinc-400">CPU Load (15m)</span>
              <span className="font-semibold text-zinc-100">{runtime?.cpuLoadAvg?.fifteenMin ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Recent Tenders</h3>
          <div className="space-y-2">
            {(recent.tenders || []).map((item) => (
              <div key={item._id} className="rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                <p className="text-sm text-zinc-100">{item.title}</p>
                <p className="text-xs text-zinc-400">
                  {item.status} | {item.referenceNumber || 'N/A'} | Updated {new Date(item.updatedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Recent Bids</h3>
          <div className="space-y-2">
            {(recent.bids || []).map((item) => (
              <div key={item._id} className="rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                <p className="text-sm text-zinc-100">{item.tender?.title || 'Unknown Tender'}</p>
                <p className="text-xs text-zinc-400">
                  {item.status} | Amount: {item.amount} | Updated {new Date(item.updatedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Company Management</h3>

          <form onSubmit={onCreateCompany} className="mb-4 grid gap-2">
            <Input
              value={newCompany.name}
              onChange={(e) => setNewCompany((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Company name"
              className="border-zinc-700 bg-zinc-950 text-zinc-100"
              required
            />
            <Input
              value={newCompany.emailDomain}
              onChange={(e) => setNewCompany((prev) => ({ ...prev, emailDomain: e.target.value }))}
              placeholder="example.com"
              className="border-zinc-700 bg-zinc-950 text-zinc-100"
              required
            />
            <Input
              value={newCompany.industry}
              onChange={(e) => setNewCompany((prev) => ({ ...prev, industry: e.target.value }))}
              placeholder="Industry (optional)"
              className="border-zinc-700 bg-zinc-950 text-zinc-100"
            />
            <Button
              type="submit"
              className="w-fit"
              disabled={createCompanyMutation.isPending}
            >
              Add Company
            </Button>
          </form>

          {companiesLoading ? (
            <p className="text-sm text-zinc-400">Loading companies...</p>
          ) : (
            <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {companies.map((company) => (
                <div key={company.id} className="rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{company.name}</p>
                      <p className="text-xs text-zinc-400">
                        {company.emailDomain} | Users: {company.usage?.users || 0} | Tenders: {company.usage?.tenders || 0}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteCompany(company.id, company.name)}
                      disabled={deleteCompanyMutation.isPending}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Users By Company</h3>
          {usersByCompanyLoading ? (
            <p className="text-sm text-zinc-400">Loading users...</p>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {usersGrouped.map((group) => (
                <div key={group.company._id} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                  <p className="mb-2 text-sm font-semibold text-zinc-100">
                    {group.company.name} <span className="text-zinc-500">({group.users.length})</span>
                  </p>
                  <div className="space-y-2">
                    {group.users.map((user) => (
                      <div key={user._id} className="flex items-center justify-between gap-2 rounded border border-zinc-800 px-2 py-1">
                        <div>
                          <p className="text-sm text-zinc-200">{user.name}</p>
                          <p className="text-xs text-zinc-500">{user.email} | {user.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onToggleUserBlock(user)}
                            disabled={blockMutation.isPending || unblockMutation.isPending}
                          >
                            {user.isActive ? <Ban className="mr-1 h-4 w-4" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                            {user.isActive ? 'Block' : 'Unblock'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteUserMutation.mutate(user._id)}
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={deleteCompanyDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCompanyDialog({ open: false, companyId: null, companyName: '' });
          }
        }}
        title={`Remove ${deleteCompanyDialog.companyName}?`}
        description="This can delete all related records for this company."
        confirmLabel="Remove Company"
        confirmVariant="destructive"
        onConfirm={() => {
          if (!deleteCompanyDialog.companyId) return;
          deleteCompanyMutation.mutate(
            { companyId: deleteCompanyDialog.companyId, force: true },
            {
              onSettled: () => {
                setDeleteCompanyDialog({ open: false, companyId: null, companyName: '' });
              },
            }
          );
        }}
        isLoading={deleteCompanyMutation.isPending}
      />
    </div>
  );
}
