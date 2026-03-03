// frontend/src/components/Layout.jsx
import { useAuth } from '../context/authContext.jsx';
import { useWebSocket } from '../contexts/WebSocketContext/WebSocketContext';
import { useTheme } from '../context/useTheme.js';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import api from '@/api/axios';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  User,
  ChevronRight,
  Search,
  Gavel,
  Users,
  MessageSquare,
  Bell,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Info,
  MonitorCog
} from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function Layout({ children }) {
  const { state, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { socket } = useWebSocket(); 
  const location = useLocation();
  const navigate = useNavigate();
  const [totalUnread, setTotalUnread] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // 1. Listen for global unread notifications
  useEffect(() => {
    // Safety check: ensure socket and user exist
    if (!socket || !state?.user) return;
    const currentUserId = state?.user?.id || state?.user?._id || state?.user?.userId;

    const handleNewMsg = (msg) => {
      const senderId = String(msg?.sender?._id || msg?.sender);
      if (senderId === String(currentUserId)) return;
      if (location.pathname !== '/messages') {
        setTotalUnread(prev => prev + 1);
      }
    };

    socket.on('newMessage', handleNewMsg);
    socket.on('newTeamMessage', handleNewMsg);

    return () => {
      socket.off('newMessage', handleNewMsg);
      socket.off('newTeamMessage', handleNewMsg);
    };
  }, [socket, location.pathname, state?.user]);

  // 2. Reset badge when user navigates to messages page
  useEffect(() => {
    if (location.pathname === '/messages') {
      setTotalUnread(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchRecentNotifications = async () => {
      try {
        const response = await api.get('/notifications', { params: { limit: 5, page: 1 } });
        setRecentNotifications(response.data?.items || []);
        setUnreadNotificationCount(response.data?.unreadCount || 0);
      } catch (err) {
        console.error('Failed to fetch notifications:', err.message);
      }
    };

    if (state?.isAuthenticated) {
      fetchRecentNotifications();
    }
  }, [state?.isAuthenticated]);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.patch(`/notifications/${notification._id}/read`);
        setRecentNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id
              ? { ...item, isRead: true, readAt: new Date().toISOString() }
              : item
          )
        );
        setUnreadNotificationCount((prev) => Math.max(prev - 1, 0));
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err.message);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setRecentNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }))
      );
      setUnreadNotificationCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err.message);
    }
  };

  const showNotificationToast = useCallback((notification) => {
    const getIcon = () => {
      if (notification?.type === 'BID_ACCEPTED') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      if (notification?.type === 'BID_REJECTED') return <AlertCircle className="h-4 w-4 text-red-400" />;
      return <Info className="h-4 w-4 text-blue-400" />;
    };

    toast.custom(
      (t) => (
        <div
          className={`pointer-events-auto w-[340px] rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur transition-all duration-300 ease-out ${
            t.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{getIcon()}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{notification?.title || 'New notification'}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification?.message || ''}</p>
            </div>
          </div>
        </div>
      ),
      { duration: 4500, position: 'top-right' }
    );
  }, []);

  useEffect(() => {
    if (!socket || !state?.isAuthenticated) return;

    const handleNewNotification = (notification) => {
      setRecentNotifications((prev) => [notification, ...prev].slice(0, 5));
      setUnreadNotificationCount((prev) => prev + 1);
      showNotificationToast(notification);
    };

    socket.on('notification:new', handleNewNotification);
    return () => socket.off('notification:new', handleNewNotification);
  }, [socket, state?.isAuthenticated, showNotificationToast]);

  const navigation = [
    { 
      name: 'Overview', 
      href: '/dashboard', 
      icon: LayoutDashboard,
      roles: ['COMPANY_ADMIN', 'TENDER_POSTER', 'BIDDER'] 
    },
    { 
      name: 'Messages', 
      href: '/messages', 
      icon: MessageSquare,
      roles: ['COMPANY_ADMIN', 'TENDER_POSTER', 'BIDDER'] 
    },
    { 
      name: 'Browse Tenders', 
      href: '/browse-tenders', 
      icon: Search,
      roles: ['BIDDER', 'COMPANY_ADMIN', 'TENDER_POSTER'] 
    },
    { 
      name: 'My Bids', 
      href: '/my-bids', 
      icon: Gavel,
      roles: ['BIDDER', 'COMPANY_ADMIN'] 
    },
    { 
      name: 'My Tenders', 
      href: '/tenders', 
      icon: FileText,
      roles: ['COMPANY_ADMIN', 'TENDER_POSTER'] 
    },
    { 
      name: 'Team Management', 
      href: '/teams', 
      icon: Users,
      roles: ['COMPANY_ADMIN', 'SUPER_ADMIN'] 
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings,
      roles: ['COMPANY_ADMIN'] 
     },
    {
      name: 'Developer Panel',
      href: '/developer-panel',
      icon: MonitorCog,
      roles: ['SUPER_ADMIN']
    },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border flex flex-col fixed h-full bg-card">
          <div className="p-6">
            <h2 className="text-xl font-bold tracking-tighter flex items-center gap-2">
              <div className="h-6 w-6 bg-foreground rounded-md flex items-center justify-center">
                <div className="h-3 w-3 bg-background rotate-45" />
              </div>
              TenderFlow
            </h2>
            
            <nav className="mt-8 space-y-1">
              {navigation
                /* Added Optional Chaining and fallback to avoid filter crashes */
                .filter(item => item.roles.includes(state?.user?.role || ""))
                .map((item) => {
                  const isActive = location.pathname === item.href;
                  const isMessages = item.href === '/messages';
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <div className="relative">
                        <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                        {isMessages && totalUnread > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                          </span>
                        )}
                      </div>
                      {item.name}
                      {isActive && (
                        <ChevronRight className="ml-auto h-4 w-4 text-blue-400" />
                      )}
                    </Link>
                  );
                })}
            </nav>
          </div>
          
          {/* User Profile Footer */}
          <div className="mt-auto p-4 border-t border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center border border-border overflow-hidden shrink-0">
                  {state?.user?.profileImageUrl ? (
                    <img
                      src={state.user.profileImageUrl}
                      alt={state?.user?.name || 'Profile'}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground font-bold">
                      {state?.user?.name ? state.user.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{state?.user?.name || 'Loading...'}</p>
                  <p className="text-xs text-muted-foreground">
                    {/* Added optional chaining and safe string manipulation */}
                    {state?.user?.role?.toLowerCase().replace('_', ' ') || ''}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 ml-64">
          <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between h-16 px-6">
              <h1 className="text-lg font-semibold">
                {navigation.find(nav => nav.href === location.pathname)?.name || 'Dashboard'}
              </h1>
              
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTheme}
                  className="rounded-full border-border"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full">
                      <Bell className="h-5 w-5" />
                      {unreadNotificationCount > 0 && (
                        <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-blue-500 border border-card" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel className="flex items-center justify-between">
                      <span>Notifications</span>
                      {unreadNotificationCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="text-xs font-normal text-blue-500 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {recentNotifications.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground">No recent notifications</div>
                    ) : (
                      recentNotifications.map((item) => (
                        <DropdownMenuItem
                          key={item._id}
                          onSelect={() => handleNotificationClick(item)}
                          className="items-start gap-3 py-3"
                        >
                          <span
                            className={`mt-1 h-2 w-2 rounded-full ${
                              item.isRead ? 'bg-muted' : 'bg-blue-500'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate('/notifications')}>
                      View more
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button variant="ghost" size="icon" className="rounded-full border border-border overflow-hidden">
                  {state?.user?.profileImageUrl ? (
                    <img
                      src={state.user.profileImageUrl}
                      alt={state?.user?.name || 'Profile'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </header>
          
          <main className="p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
  );
}

export default Layout;
