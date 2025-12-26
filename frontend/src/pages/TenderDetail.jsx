// src/pages/TenderDetail.jsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, DollarSign, FileText } from 'lucide-react';

export default function TenderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
const [editLoading, setEditLoading] = useState(false);

  // Bids state
  const [bids, setBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(true);
  const [bidsError, setBidsError] = useState('');

// form fields
const [editTitle, setEditTitle] = useState('');
const [editDescription, setEditDescription] = useState('');
const [editBudgetMin, setEditBudgetMin] = useState('');
const [editBudgetMax, setEditBudgetMax] = useState('');
const [editDeadline, setEditDeadline] = useState('');
const [editTags, setEditTags] = useState('');

  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const isOwner = useMemo(() => {
    if (!user || !tender){
      console.log('isOwner: false - Missing user or tender');
      return false;

    } 
   const tenderOwnerCompanyId = tender.ownerCompany?._id ? 
    tender.ownerCompany._id.toString() : 
    tender.ownerCompany?.toString();
  const isOwnerValue = user.companyId === tenderOwnerCompanyId;
  console.log('isOwner check:', {
    userCompanyId: user.companyId,
    tenderOwnerCompany: tender.ownerCompany,
    tenderOwnerCompanyId: tenderOwnerCompanyId, // Add this for more detailed debugging
    isOwner: isOwnerValue
  });3
  return isOwnerValue;
  }, [user, tender]);

    const fetchTender = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/tenders/${id}`);
      const t = res.data;
      setTender(t);
      
      // Hydrate edit form
      setEditTitle(t.title || '');
      setEditDescription(t.description || '');
      setEditBudgetMin(t.budgetMin ?? '');
      setEditBudgetMax(t.budgetMax ?? '');
      setEditDeadline(
        t.deadline ? new Date(t.deadline).toISOString().slice(0, 16) : ''
      );
      setEditTags((t.tags || []).join(', '));

      // Optimistically fetch bids - API enforces permissions
      fetchBids(t._id);

    } catch (err) {
      console.error('Failed to fetch tender:', err);
      setError('Failed to load tender');
    } finally {
      setLoading(false);
    }
  };
    const fetchBids = async (tenderId) => {
    setBidsLoading(true);
    try {
      const res = await api.get(`/bids/tender/${tenderId}`);
      setBids(res.data);
    } catch (err) {
      console.error('Failed to fetch bids:', err);
      // Don't show error to user as bids are secondary
    } finally {
      setBidsLoading(false);
    }
  };

  useEffect(() => {
    fetchTender();
  }, [id]);

  const statusBadge = (status) => {
    const colors = {
      DRAFT: 'default',
      PUBLISHED: 'default',
      CLOSED: 'secondary',
      AWARDED: 'success',
    };
    return <Badge variant={colors[status] || 'secondary'}>{status}</Badge>;
  };

  

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    setEditLoading(true);
    setError('');

    try {
      console.log('Preparing payload...');
      const payload = {
        title: editTitle,
        description: editDescription,
        budgetMin: editBudgetMin ? Number(editBudgetMin) : undefined,
        budgetMax: editBudgetMax ? Number(editBudgetMax) : undefined,
        deadline: editDeadline ? new Date(editDeadline).toISOString() : undefined,
        tags: editTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      
      console.log('Sending PATCH request with payload:', payload);
      const res = await api.patch(`/tenders/${id}`, payload);
      console.log('API Response:', res.data);
      
      setTender(res.data);
      setEditOpen(false);
      console.log('Tender updated successfully');
    } catch (err) {
      console.error('Error updating tender:', {
        error: err,
        response: err.response?.data
      });
      setError(
        err.response?.data?.message || 'Failed to update tender. Please check the console for details.'
      );
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="space-y-2 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading tender...</p>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <p className="mb-4 text-lg">Tender not found.</p>
        <Button variant="outline" onClick={() => navigate('/tenders')}>
          Go back
        </Button>
      </div>
    );
  }

  const canPublish = isOwner && tender.status === 'DRAFT';
  const canClose = isOwner && tender.status === 'PUBLISHED';
  const canAward = isOwner && tender.status === 'CLOSED';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
  <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-3">
          {tender.title}
          {statusBadge(tender.status)}
        </h1>
        <p className="text-sm text-muted-foreground">
          Tender reference: {tender._id}
        </p>
        <p className="text-xs text-muted-foreground">
          debug isOwner: {String(isOwner)} | status: {tender.status}
        </p>
      </div>
    </div>

    {isOwner && tender.status === 'DRAFT' && (
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tender</DialogTitle>
            <DialogDescription>
              Update the tender details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetMin">Min Budget</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  value={editBudgetMin}
                  onChange={(e) => setEditBudgetMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetMax">Max Budget</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  value={editBudgetMax}
                  onChange={(e) => setEditBudgetMax(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="e.g., construction, road, civil"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    )}
  </div>
</header>

      <main className="container mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="p-3 rounded-md border border-destructive/40 bg-destructive/10 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          {/* Left: main info */}
          <div className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>
                  Basic information about this tender.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="whitespace-pre-line">
                  {tender.description}
                </p>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  {(tender.budgetMin || tender.budgetMax) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Estimated budget
                        </p>
                        <p className="font-medium">
                          ₹
                          {tender.budgetMin?.toLocaleString()}{' '}
                          - ₹
                          {tender.budgetMax?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {tender.deadline && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Bid submission deadline
                        </p>
                        <p className="font-medium">
                          {new Date(
                            tender.deadline
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {tender.tags?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {tender.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  Attached tender documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {tender.documents?.length ? (
                  tender.documents.map((doc) => (
                    <button
                      key={doc._id || doc.url}
                      className="w-full flex items-center justify-between rounded-md border border-border px-3 py-2 text-left hover:bg-accent transition-colors"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{doc.name || 'Document'}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        View
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    No documents attached.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: actions + bids placeholder */}
          <div className="space-y-4">
            {isOwner && (
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle>Status actions</CardTitle>
                  <CardDescription>
                    Change tender status across its lifecycle.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={!canPublish || actionLoading}
                      onClick={() => handleStatusChange('PUBLISHED')}
                    >
                      Publish
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!canClose || actionLoading}
                      onClick={() => handleStatusChange('CLOSED')}
                    >
                      Close
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canAward || actionLoading}
                      onClick={() => handleStatusChange('AWARDED')}
                    >
                      Award
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Draft → Published → Closed → Awarded.
                    Status updates use PATCH to partially update the tender resource.[web:40][web:49]
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Bids</CardTitle>
                <CardDescription>
                  List of bids for this tender (owner view).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {bidsLoading ? (
                  <p className="text-muted-foreground">Loading bids...</p>
                ) : bids.length === 0 ? (
                  <p className="text-muted-foreground">
                    No bids submitted yet for this tender.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[2fr,1fr,1fr,1fr] gap-2 text-xs text-muted-foreground">
                      <span>Bidder</span>
                      <span>Amount</span>
                      <span>Status</span>
                      <span>AI score / rank</span>
                    </div>
                    <div className="space-y-1">
                      {bids
                        .slice()
                        .sort((a, b) => (a.aiRank || 999) - (b.aiRank || 999))
                        .map((bid) => (
                          <div
                            key={bid._id}
                            className="grid grid-cols-[2fr,1fr,1fr,1fr] gap-2 items-center rounded-md border border-border px-3 py-2 hover:bg-accent/40 transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {bid.bidderCompany?.name || 'Unknown company'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                By {bid.submittedBy?.name || 'Unknown user'} •{' '}
                                {new Date(bid.createdAt).toLocaleString()}
                              </span>
                            </div>

                            <span className="font-semibold">
                              ₹{bid.amount?.toLocaleString()}
                            </span>

                            <span className="text-xs uppercase tracking-wide">
                              {bid.status}
                            </span>

                            <div className="flex flex-col">
                              <span>
                                {bid.aiScore != null
                                  ? `${(bid.aiScore * 100).toFixed(0)}%` 
                                  : '—'}
                                {bid.aiRank != null ? ` • #${bid.aiRank}` : ''}
                              </span>
                              {bid.aiNotes && (
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {bid.aiNotes}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
