import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, FileText, DollarSign, Clock } from 'lucide-react';

export default function Tenders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [tags, setTags] = useState('');

  const isBidder = user?.role === 'BIDDER';

  const endpoint = isBidder ? '/tenders/available' : '/tenders/my-company';

  useEffect(() => {
    setLoading(true);
    api
      .get(endpoint)
      .then((res) => setTenders(res.data))
      .catch((err) => {
        console.error(err);
        setError('Failed to load tenders');
      })
      .finally(() => setLoading(false));
  }, [endpoint]);

  const statusBadge = (status) => {
    const colors = {
      DRAFT: 'default',
      PUBLISHED: 'default',
      CLOSED: 'secondary',
      AWARDED: 'success',
    };
    return <Badge variant={colors[status] || 'secondary'}>{status}</Badge>;
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setBudgetMin('');
    setBudgetMax('');
    setDeadline('');
    setTags('');
    setError('');
  };

  const handleCreateTender = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const payload = {
        title,
        description,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const res = await api.post('/tenders', payload);

      setTenders((prev) => [res.data, ...prev]);
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Failed to create tender'
      );
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-2 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading tenders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isBidder ? 'Available Tenders' : 'My Tenders'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isBidder
                ? 'Browse and bid on published tenders.'
                : 'Create and manage tenders for your company.'}
            </p>
          </div>

          {!isBidder && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Tender
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Tender</DialogTitle>
                  <DialogDescription>
                    Define the basic details. You can manage status later from
                    the detail page.
                  </DialogDescription>
                </DialogHeader>

                {error && (
                  <div className="mb-3 p-2 rounded-md border border-destructive/40 bg-destructive/10 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <form
                  className="space-y-4"
                  onSubmit={handleCreateTender}
                >
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Procurement of medical equipment"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value)
                      }
                      placeholder="Brief description of the tender scope, requirements, and expectations."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="budgetMin">
                        Budget min (₹)
                      </Label>
                      <Input
                        id="budgetMin"
                        type="number"
                        min="0"
                        value={budgetMin}
                        onChange={(e) =>
                          setBudgetMin(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budgetMax">
                        Budget max (₹)
                      </Label>
                      <Input
                        id="budgetMax"
                        type="number"
                        min="0"
                        value={budgetMax}
                        onChange={(e) =>
                          setBudgetMax(e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline">
                      Bid submission deadline
                    </Label>
                    <Input
                      id="deadline"
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) =>
                        setDeadline(e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">
                      Tags (comma separated)
                    </Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="construction, civil, road"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setDialogOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading
                        ? 'Creating...'
                        : 'Create Tender'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8">
        {tenders.length === 0 ? (
          <Card className="bg-card border-dashed border-muted-foreground/40">
            <CardContent className="flex flex-col items-center justify-center py-24 text-center space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">
                  No tenders found
                </h3>
                <p className="text-muted-foreground">
                  {isBidder
                    ? 'There are no published tenders to bid on yet.'
                    : 'Create your first tender to get started.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tenders.map((tender) => (
              <Card
                key={tender._id}
                className="hover:shadow-md transition-shadow cursor-pointer bg-card"
                onClick={() => navigate(`/tenders/${tender._id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight line-clamp-2">
                      {tender.title}
                    </CardTitle>
                    {statusBadge(tender.status)}
                  </div>
                  <CardDescription className="mt-1 line-clamp-2">
                    {tender.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pb-6 text-sm">
                  {tender.budgetMin &&
                    tender.budgetMax && (
                      <div className="flex items-center gap-2 text-foreground">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-semibold">
                          ₹
                          {tender.budgetMin.toLocaleString()}{' '}
                          - ₹
                          {tender.budgetMax.toLocaleString()}
                        </span>
                      </div>
                    )}

                  {tender.deadline && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(
                          tender.deadline
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {tender.tags?.length > 0 && (
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
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
