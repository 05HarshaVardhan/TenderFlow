import { useAuth } from '@/context/AuthContext';
import { FileText, Activity, Users, CheckCircle2, Briefcase, Clock } from 'lucide-react';
import IdentityHeader from './IdentityHeader';
import StatCard from './StatCard';
import BiddingCharts from './BiddingCharts';

export default function Dashboard() {
  const { state } = useAuth();
  const { user } = state;

  const mockBidData = [
    { name: 'Accepted', value: 40 },
    { name: 'Pending', value: 35 },
    { name: 'Rejected', value: 25 },
  ];

  return (
    <div className="p-6 bg-black min-h-screen space-y-6 text-white">
      {/* 1. Header */}
      <IdentityHeader user={user} />

      {/* 2. Numerical Grid (RBAC Filtered) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {user?.role === 'COMPANY_ADMIN' ? (
          <>
            <StatCard title="Total Tenders" value="84" icon={FileText} sub="Lifetime Posted" />
            <StatCard title="Live Tenders" value="12" icon={Activity} color="text-blue-400" sub="Active Now" />
            <StatCard title="Total Bidders" value="342" icon={Users} sub="Unique Companies" />
            <StatCard title="Completed" value="68" icon={CheckCircle2} color="text-emerald-400" sub="Awarded" />
          </>
        ) : (
          <>
            <StatCard title="My Bids" value="15" icon={Briefcase} sub="Total Submissions" />
            <StatCard title="Accepted" value="4" icon={CheckCircle2} color="text-emerald-400" sub="Won" />
            <StatCard title="Pending" value="7" icon={Clock} color="text-amber-400" sub="Waiting" />
            <StatCard title="Success Rate" value="28%" icon={Activity} sub="Selection %" />
          </>
        )}
      </div>

      {/* 3. Analytics Section */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <BiddingCharts data={mockBidData} />
        {/* You can add another chart component here for Tender Trends */}
      </div>
    </div>
  );
}