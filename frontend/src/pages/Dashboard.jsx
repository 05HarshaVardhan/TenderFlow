import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, LogOut, FileText, Clock, DollarSign } from 'lucide-react';

const roleConfig = {
  COMPANY_ADMIN: {
    title: 'Company Dashboard',
    description: 'Manage your tenders and team',
    endpoint: '/tenders/my-company',
    primaryAction: 'New Tender',
    actionPath: '/tenders',
  },
  TENDER_POSTER: {
    title: 'Tender Dashboard',
    description: 'Create and manage procurement opportunities',
    endpoint: '/tenders/my-company',
    primaryAction: 'New Tender',
    actionPath: '/tenders',
  },
  BIDDER: {
    title: 'Bidder Dashboard',
    description: 'Find and respond to available tenders',
    endpoint: '/tenders/available',
    primaryAction: 'Browse Tenders',
    actionPath: '/tenders',
  },
  AUDITOR: {
    title: 'Audit Dashboard',
    description: 'Review tenders and bids',
    endpoint: '/tenders/my-company',
    primaryAction: 'View Tenders',
  },
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const config = roleConfig[user?.role] || roleConfig.TENDER_POSTER;

  useEffect(() => {
    api.get(config.endpoint)
      .then((res) => setTenders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config.endpoint, user]);

  const statusBadge = (status) => {
    const colors = {
      DRAFT: 'default',
      PUBLISHED: 'default',
      CLOSED: 'secondary',
      AWARDED: 'success',
    };
    return (
      <Badge variant={colors[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
              <p className="text-muted-foreground">{config.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{user.companyName}</Badge>
                <Badge>{user.role.replace('_', ' ')}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {(config.primaryAction || config.actionPath) && (
          <div className="mb-8">
            <Button onClick={() => navigate(config.actionPath)}>
              <Plus className="w-4 h-4 mr-2" />
              {config.primaryAction}
            </Button>
          </div>
        )}

        {tenders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-24 text-center space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No tenders yet</h3>
                <p className="text-muted-foreground">
                  {config.primaryAction 
                    ? 'Create your first tender to get started.' 
                    : 'No available tenders right now.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tenders.map((tender) => (
              <Card key={tender._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight line-clamp-2">
                      {tender.title}
                    </CardTitle>
                    {statusBadge(tender.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-6">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {tender.description}
                  </p>
                  
                  {tender.budgetMin && tender.budgetMax && (
                    <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        ₹{tender.budgetMin.toLocaleString()} - ₹{tender.budgetMax.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {tender.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tender.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
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
