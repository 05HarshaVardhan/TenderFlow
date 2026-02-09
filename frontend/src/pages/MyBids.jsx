import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Gavel, Clock, CheckCircle2, XCircle, 
  ExternalLink, FileText, DollarSign, Edit3,
  Building2, User2, Hash, Calendar
} from "lucide-react";
import { toast } from "react-hot-toast";
import BidSubmissionModal from '@/components/tenders/BidSubmissionModal';

export default function MyBids() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  useEffect(() => {
    fetchMyBids();
  }, []);

  const fetchMyBids = async () => {
    try {
      const response = await api.get('/bids/my-company');
      setBids(response.data);
    } catch (err) {
      toast.error("Failed to load your bids");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (bid, viewMode = false) => {
    setSelectedBid(bid);
    setIsViewOnly(viewMode);
    setIsEditModalOpen(true);
  };

  const handlePublishBid = async (bidId) => {
    if (!window.confirm("Ready to submit? Once submitted, the price cannot be changed.")) return;
    try {
      await api.patch(`/bids/${bidId}/submit`);
      toast.success("Bid submitted successfully!");
      fetchMyBids(); 
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit bid");
    }
  };

  const handleWithdraw = async (bidId) => {
    const isDraft = bids.find(b => b._id === bidId)?.status === 'DRAFT';
    if (!window.confirm(`Are you sure you want to ${isDraft ? 'delete this draft' : 'withdraw this bid'}?`)) return;
    try {
      await api.delete(`/bids/${bidId}`);
      toast.success(isDraft ? "Draft deleted" : "Bid withdrawn");
      fetchMyBids();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'ACCEPTED': return { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2, label: 'Winner' };
      case 'REJECTED': return { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle, label: 'Rejected' };
      case 'SUBMITTED': return { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock, label: 'Under Review' };
      default: return { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: FileText, label: 'Draft' };
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-2">
        <Clock className="h-8 w-8 animate-spin text-zinc-500" />
        <p className="text-zinc-400 font-medium">Loading your bids...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-white">
      <div className="flex flex-col gap-1 border-b border-zinc-800 pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight">My Bids</h1>
        <p className="text-zinc-400">Manage your active proposals and track tender status.</p>
      </div>

      <div className="grid gap-6">
        {bids.length === 0 ? (
          <div className="text-center py-24 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
            <div className="inline-flex p-4 rounded-full bg-zinc-900 mb-4">
              <Gavel className="h-8 w-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300">No active bids</h3>
            <p className="text-zinc-500 max-w-xs mx-auto mt-2">
              You haven't placed any bids yet. Explore open tenders to get started.
            </p>
          </div>
        ) : (
          bids.map((bid) => {
            const status = getStatusConfig(bid.status);
            const isDraft = bid.status === 'DRAFT';
            const canAction = bid.tender?.status === 'PUBLISHED';

            return (
              <Card key={bid._id} className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-all duration-300 shadow-sm overflow-hidden group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                    
                    {/* Primary Info Section */}
                    <div className="flex-1 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={`${status.color} border px-2 py-0.5 rounded-full capitalize text-[10px] font-bold tracking-wider`}>
                            <status.icon className="mr-1 h-3 w-3" /> {status.label}
                          </Badge>
                          <div className="flex items-center text-xs text-zinc-500 font-medium">
                            <Hash className="h-3 w-3 mr-1" /> {bid.tender?.referenceNumber || 'N/A'}
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
                          ID: {bid._id.slice(-6)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
                          {bid.tender?.title}
                        </h3>
                        <div className="flex flex-wrap gap-y-2 gap-x-6 pt-1">
                          <div className="flex items-center text-sm text-zinc-400">
                            <Building2 className="mr-2 h-4 w-4 text-zinc-500" />
                            <span className="font-medium mr-1">Org:</span> {bid.tender?.ownerCompany?.name || 'N/A'}
                          </div>
                          <div className="flex items-center text-sm text-zinc-400">
                            <User2 className="mr-2 h-4 w-4 text-zinc-500" />
                            <span className="font-medium mr-1">Owner:</span> {bid.tender?.createdBy?.name || 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-800/50">
                        <p className="text-sm text-zinc-400 italic line-clamp-1 flex items-start">
                          <FileText className="h-4 w-4 mr-2 mt-0.5 shrink-0 text-zinc-600" />
                          {bid.notes ? `"${bid.notes}"` : "No proposal notes attached."}
                        </p>
                      </div>
                    </div>

                    {/* Financial & Actions Section */}
                    <div className="bg-zinc-900/20 md:w-80 p-6 flex flex-col justify-between space-y-6">
                      <div className="flex md:flex-col justify-between items-end md:items-start">
                        <div className="space-y-0.5">
                          <p className="text-[10px] uppercase font-black text-zinc-500 tracking-tighter">Your Proposal</p>
                          <div className="flex items-baseline text-2xl font-black text-emerald-400">
                            <span className="text-lg mr-0.5">$</span>
                            {bid.amount?.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-zinc-400 font-medium mt-1">
                          <Calendar className="h-3.5 w-3.5 mr-1.5 text-zinc-500" />
                          {bid.deliveryDays} Days Delivery
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs h-9 border border-zinc-700/50"
                          onClick={() => handleEditClick(bid, true)}
                        >
                          <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Full Details
                        </Button>

                        {isDraft && canAction ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                              onClick={() => handleEditClick(bid, false)}
                            >
                              <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                              onClick={() => handlePublishBid(bid._id)}
                            >
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Submit
                            </Button>
                          </div>
                        ) : null}

                        {(bid.status === 'SUBMITTED' || isDraft) && canAction && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="w-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 text-[11px] h-8"
                            onClick={() => handleWithdraw(bid._id)}
                          >
                            <XCircle className="mr-2 h-3.5 w-3.5" /> 
                            {isDraft ? 'Discard Draft' : 'Withdraw Proposal'}
                          </Button>
                        )}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <BidSubmissionModal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedBid(null);
          setIsViewOnly(false);
        }} 
        existingBid={selectedBid} 
        isViewOnly={isViewOnly}
        tender={selectedBid?.tender}
        onRefresh={fetchMyBids}
      /> 
    </div>
  );
}