import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboard';

// Components
import StatCard from '@/components/dashboard/StatCard';
import IdentityHeader from '@/components/dashboard/IdentityHeader';
import BiddingCharts from '@/components/dashboard/BiddingCharts';
import TeamOverview from '@/components/dashboard/TeamOverview';
import api from '@/api/axios';
import { toast } from "react-hot-toast";
import TenderListTable from '@/components/tenders/TenderListTable'; 
import CreateTenderModal from '@/components/tenders/CreateTenderModal';

// Icons
import { FileText, Activity, Users, CheckCircle2, Briefcase, Clock, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Data Processing Helpers
 */
function processTenderStats(tenders) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  
  // Reorder months to start from current month
  const reorderedMonths = [];
  for (let i = 0; i < 12; i++) {
    const index = (currentMonth - 11 + i + 12) % 12; // Get last 12 months, current month last
    reorderedMonths.push(months[index]);
  }

  const statsMap = reorderedMonths.reduce((acc, month) => {
    acc[month] = 0;
    return acc;
  }, {});
  
  tenders.forEach(t => {
    const date = new Date(t.createdAt || t.endDate); 
    const monthName = months[date.getMonth()];
    if (statsMap.hasOwnProperty(monthName)) {
      statsMap[monthName]++;
    }
  });

  return reorderedMonths.map(name => ({
    name,
    count: statsMap[name]
  }));
}

function processBidStats(bids, role) {
  const stats = {};

  // Initialize buckets based on your specific requirements
  if (role === 'COMPANY_ADMIN') {
    // Global company view
    stats['PENDING'] = 0; 
    stats['REWARDED'] = 0;
    stats['REJECTED'] = 0;
  } else if (role === 'TENDER_POSTER') {
    // Incoming bids for their specific tenders
    stats['PENDING'] = 0; 
    stats['REWARDED'] = 0;
    stats['REJECTED'] = 0;
  } else if (role === 'BIDDER') {
    // Individual's personal activity
    stats['DRAFT'] = 0;
    stats['PENDING'] = 0;
    stats['REWARDED'] = 0;
    stats['REJECTED'] = 0;
  }

  bids.forEach(bid => {
    const status = bid.status?.toUpperCase();

    // Mapping logic to match your desired terminology
    if (role === 'BIDDER') {
      if (status === 'DRAFT') stats['DRAFT']++;
      else if (status === 'SUBMITTED' || status === 'PENDING') stats['PENDING']++;
      else if (status === 'ACCEPTED' || status === 'AWARDED') stats['REWARDED']++;
      else if (status === 'REJECTED') stats['REJECTED']++;
    } 
    else {
      // Logic for Admin and Poster
      if (status === 'SUBMITTED' || status === 'PENDING') stats['PENDING']++;
      else if (status === 'AWARDED' || status === 'ACCEPTED') stats['REWARDED']++;
      else if (status === 'REJECTED') stats['REJECTED']++;
    }
  });

  return Object.keys(stats).map(key => ({
    name: key,
    value: stats[key]
  }));
}

export default function Dashboard() {
  const { state } = useAuth();
  const { user } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { tenders, bids, team, loading, refreshData } = useDashboardStats(user?.role);

  const handleTenderAction = async (id, action) => {
    try {
      await api.patch(`/tenders/${id}/${action}`);
      toast.success(`Tender ${action}ed successfully`);
      refreshData(); 
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  if (loading) return (
    <div className="p-8 text-white flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-zinc-500">Loading live data...</div>
    </div>
  );

  const bidStats = processBidStats(bids, user?.role);
  const tenderStats = processTenderStats(tenders);

  return (
    <div className="p-6 bg-black min-h-screen space-y-6 text-white">
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-zinc-900 pb-6">
        <div className="flex-1">
          <IdentityHeader user={user} />
        </div>
        
        {(user?.role === 'COMPANY_ADMIN' || user?.role === 'TENDER_POSTER') && (
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-11 shadow-lg shadow-blue-900/20 shrink-0 transition-all active:scale-95"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            <span className="font-semibold">New Tender</span>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {user?.role === 'COMPANY_ADMIN' || user?.role === 'TENDER_POSTER' ? (
          <>
            <StatCard title="Total Tenders" value={tenders.length} icon={FileText} sub="Lifetime Posted" />
            <StatCard title="Live Tenders" value={tenders.filter(t => t.status === 'PUBLISHED').length} icon={Activity} color="text-blue-400" sub="Active Now" />
            <StatCard title="Total Bids" value={bids.length} icon={Users} sub="Total Received" />
            <StatCard title="Awarded" value={tenders.filter(t => t.status === 'AWARDED').length} icon={CheckCircle2} color="text-emerald-400" sub="Completed" />
          </>
        ) : (
          <>
            <StatCard title="My Bids" value={bids.length} icon={Briefcase} sub="Total Submissions" />
            <StatCard title="Accepted" value={bids.filter(b => b.status === 'ACCEPTED').length} icon={CheckCircle2} color="text-emerald-400" sub="Won" />
            <StatCard title="Pending" value={bids.filter(b => b.status === 'PENDING' || b.status === 'SUBMITTED').length} icon={Clock} color="text-amber-400" sub="Waiting" />
            <StatCard title="Success Rate" value={bids.length > 0 ? `${Math.round((bids.filter(b => b.status === 'ACCEPTED').length / bids.length) * 100)}%` : "0%"} icon={Activity} sub="Selection %" />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <BiddingCharts 
          bidData={bidStats} 
          tenderData={tenderStats} 
          userRole={user?.role}
        />
        {user?.role === 'COMPANY_ADMIN' && <TeamOverview />}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recent Projects</h2>
          <Button variant="link" className="text-blue-500 text-sm p-0 hover:no-underline">View All</Button>
        </div>
        
        <TenderListTable 
          tenders={tenders} 
          onAction={handleTenderAction} 
        />
      </div>

      <CreateTenderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={refreshData} 
      />
    </div>
  );
}