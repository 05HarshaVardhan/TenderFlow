import { useEffect, useState } from 'react';
import api from '@/api/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchNotifications = async (nextPage = 1, append = false) => {
    try {
      const response = await api.get('/notifications', {
        params: { page: nextPage, limit: 20 }
      });

      const items = response.data?.items || [];
      setNotifications((prev) => (append ? [...prev, ...items] : items));
      setPage(nextPage);
      setHasMore(Boolean(response.data?.pagination?.hasMore));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1, false);
  }, []);

  const handleOpenNotification = async (item) => {
    try {
      if (!item.isRead) {
        await api.patch(`/notifications/${item._id}/read`);
        setNotifications((prev) =>
          prev.map((row) =>
            row._id === item._id ? { ...row, isRead: true, readAt: new Date().toISOString() } : row
          )
        );
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err.message);
    }

    if (item.link) {
      navigate(item.link);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 sm:px-0">
      <div className="mb-2 flex items-center gap-2">
        <Bell className="h-5 w-5" />
        <h1 className="text-2xl font-semibold">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No notifications yet.</CardContent>
        </Card>
      ) : (
        notifications.map((item) => (
          <button
            key={item._id}
            type="button"
            onClick={() => handleOpenNotification(item)}
            className="w-full text-left"
          >
            <Card className={`${item.isRead ? '' : 'border-blue-500/30'}`}>
              <CardContent className="flex gap-3 py-4">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.isRead ? 'bg-muted' : 'bg-blue-500'}`} />
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))
      )}

      {hasMore && (
        <div className="pt-2">
          <Button variant="outline" onClick={() => fetchNotifications(page + 1, true)}>
            View more
          </Button>
        </div>
      )}
    </div>
  );
}
