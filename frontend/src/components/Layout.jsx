// frontend\src\components\Layout.jsx
import { useAuth } from '../context/authContext.jsx'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  User,
  ChevronRight,
  Search,    // Added
  Gavel,     // Added
  Users      // Added
} from 'lucide-react'
import { useLocation, Link } from 'react-router-dom';

export default function Layout({ children }) {
  const { state, logout } = useAuth()
  const location = useLocation();

  const navigation = [
    { 
      name: 'Overview', 
      href: '/dashboard', 
      icon: LayoutDashboard,
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
      name: 'Team', 
      href: '/team', 
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
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navigation
            .filter(item => item.roles.includes(state.user?.role)) // Only show allowed links
            .map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                    isActive 
                      ? 'bg-zinc-900 text-white' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3 w-3" />}
                </Link>
              );
            })}
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <User className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{state.user?.name}</p>
              <p className="text-xs text-zinc-500 truncate capitalize">{state.user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}