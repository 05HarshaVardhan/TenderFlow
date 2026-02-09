import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Added useNavigate
import { useDashboardStats } from '@/hooks/useDashboard';
import { useAuth } from '@/context/authContext';
import api from '@/api/axios';
import { toast } from "react-hot-toast";
import { 
  PlusCircle, MoreVertical, Globe, Archive, 
  Trophy, Users, Calendar, DollarSign, Eye 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import CreateTenderModal from '@/components/tenders/CreateTenderModal';

export default function ManageTenders() {
  // 1. Initialize the navigate hook
  const navigate = useNavigate();
  const { state } = useAuth();
  const { tenders, loading, refreshData } = useDashboardStats(state.user?.role);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAction = async (id, action) => {
    try {
      await api.patch(`/tenders/${id}/${action}`);
      toast.success(`Tender ${action}ed successfully`);
      refreshData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CLOSED': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      case 'AWARDED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  if (loading) return <div className="p-8 text-white text-center">Loading management console...</div>;

  return (
    <div className="space-y-8 text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tender Management</h1>
          <p className="text-zinc-400">View and manage your project lifecycle.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <PlusCircle className="mr-2 h-4 w-4" /> New Tender
        </Button>
      </div>

      {/* Rows and Columns Grid */}
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {tenders.map((tender) => (
          <Card key={tender._id} className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-all flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <Badge className={`${getStatusColor(tender.status)} border capitalize font-medium`}>
                {tender.status.toLowerCase()}
              </Badge>
              
              {/* Management Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-zinc-900">
                    <MoreVertical className="h-4 w-4 text-zinc-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-300">
                  <DropdownMenuItem onClick={() => handleAction(tender._id, 'publish')} disabled={tender.status !== 'DRAFT'}>
                    <Globe className="mr-2 h-4 w-4" /> Publish
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction(tender._id, 'close')} disabled={tender.status !== 'PUBLISHED'}>
                    <Archive className="mr-2 h-4 w-4" /> Close
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction(tender._id, 'award')} disabled={tender.status !== 'CLOSED'}>
                    <Trophy className="mr-2 h-4 w-4" /> Award
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  
                  {/* Now uses the initialized navigate function */}
                  <DropdownMenuItem onClick={() => navigate(`/tenders/evaluate/${tender._id}`)}>
                    <Users className="mr-2 h-4 w-4" /> View & Award Bids
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>

            <CardContent className="flex-1 pt-2">
              <CardTitle className="text-lg font-semibold mb-4 line-clamp-1">{tender.title}</CardTitle>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm text-zinc-400">
                  <DollarSign className="mr-2 h-4 w-4 text-emerald-500" />
                  <span>${tender.budgetMin?.toLocaleString()} - ${tender.budgetMax?.toLocaleString()}</span>
                </div>
                <div className="flex items-center text-sm text-zinc-400">
                  <Calendar className="mr-2 h-4 w-4 text-zinc-500" />
                  <span>Deadline: {new Date(tender.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-sm text-zinc-400">
                  <Users className="mr-2 h-4 w-4 text-blue-500" />
                  <span>{tender.bids?.length || 0} Bids Received</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t border-zinc-900 pt-4 mt-auto">
              <Link to={`/tenders/evaluate/${tender._id}`} className="w-full">
                <Button variant="secondary" className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-100">
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <CreateTenderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={refreshData} 
      />
    </div>
  );
}