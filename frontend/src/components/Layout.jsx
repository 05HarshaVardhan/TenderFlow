// frontend/src/components/Layout.jsx
import { useAuth } from '../context/authContext.jsx';
import { useWebSocket } from '../contexts/WebSocketContext/WebSocketContext';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  Bell
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

function Layout({ children }) {
  const { state, logout } = useAuth();
  const { socket } = useWebSocket(); 
  const location = useLocation();
  const [totalUnread, setTotalUnread] = useState(0);

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
      roles: ['COMPANY_ADMIN'] 
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings,
      roles: ['COMPANY_ADMIN', 'TENDER_POSTER', 'BIDDER'] 
     },
  ];

  return (
    <div className="flex min-h-screen bg-black text-white">
        {/* Sidebar */}
        <aside className="w-64 border-r border-zinc-800 flex flex-col fixed h-full bg-black">
          <div className="p-6">
            <h2 className="text-xl font-bold tracking-tighter flex items-center gap-2">
              <div className="h-6 w-6 bg-white rounded-md flex items-center justify-center">
                <div className="h-3 w-3 bg-black rotate-45" />
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
                          : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'
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
          <div className="mt-auto p-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  {/* Handle undefined user initials safety */}
                  <span className="text-xs text-zinc-400 font-bold">
                    {state?.user?.name ? state.user.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{state?.user?.name || 'Loading...'}</p>
                  <p className="text-xs text-zinc-500">
                    {/* Added optional chaining and safe string manipulation */}
                    {state?.user?.role?.toLowerCase().replace('_', ' ') || ''}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={logout}
                className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 ml-64">
          <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between h-16 px-6">
              <h1 className="text-lg font-semibold">
                {navigation.find(nav => nav.href === location.pathname)?.name || 'Dashboard'}
              </h1>
              
              <div className="flex items-center gap-4">
                <Link to="/messages" className="relative">
                   <Button variant="ghost" size="icon" className="rounded-full">
                    <Bell className="h-5 w-5" />
                    {totalUnread > 0 && (
                      <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-blue-500 border border-zinc-900" />
                    )}
                  </Button>
                </Link>
                
                <Button variant="ghost" size="icon" className="rounded-full border border-zinc-800">
                  <User className="h-5 w-5" />
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
