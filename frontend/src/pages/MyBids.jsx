import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Gavel, Clock, CheckCircle2, XCircle, 
  ExternalLink, FileText, DollarSign, Edit3,
  Building2, User2, Hash, Calendar,
  Search, Filter, SortAsc, RotateCcw, AlertTriangle, ShieldCheck, Trash2, FileIcon
} from "lucide-react";
import { toast } from "react-hot-toast";
import BidSubmissionModal from '@/components/tenders/BidSubmissionModal';

export default function MyBids() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- STATE FOR MODALS ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [submitConfirmData, setSubmitConfirmData] = useState(null);

  // --- FILTER STATES (Synced with Tender Logic) ---
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const isFiltered = search !== "" || statusFilter !== "All" || sortBy !== "newest";

  useEffect(() => {
    fetchMyBids();
  }, [statusFilter, sortBy]); // Fetch when filters change

  const fetchMyBids = async () => {
    setLoading(true);
    try {
      // Assuming your backend handles these query params
      const response = await api.get('/bids/my-company', {
        params: { search, status: statusFilter, sort: sortBy }
      });
      setBids(response.data);
    } catch (err) {
      toast.error("Failed to load your bids");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setSortBy("newest");
  };

  const handleEditClick = (bid, viewMode = false) => {
    // 1. Set the data FIRST
    setSelectedBid(bid);
    setIsViewOnly(viewMode);
    // 2. Open the modal SECOND
    setIsEditModalOpen(true);
  };

  // --- REPLACEMENT FOR PUBLISH LOGIC ---
  const openSubmitAudit = (bid) => {
    // Validation before showing audit
    const missingDocs = (!bid.technicalDocs?.length && !bid.financialDocs?.length);
    if (missingDocs) {
      toast.error("Please attach documents before submitting.");
      handleEditClick(bid, false);
      return;
    }
    setSubmitConfirmData(JSON.parse(JSON.stringify(bid)));
  };

  const confirmSubmission = async () => {
    try {
      await api.patch(`/bids/${submitConfirmData._id}/submit`);
      toast.success("Bid submitted successfully!");
      setSubmitConfirmData(null);
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-white pb-20">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-zinc-800 pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight">Bid Registry</h1>
        <p className="text-zinc-400">Manage your active proposals and track tender status.</p>
      </div>

      {/* --- SEARCH & FILTER BAR (Mirroring ManageTenders) --- */}
      <div className="flex flex-col md:flex-row gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tenders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm text-zinc-300 outline-none cursor-pointer min-w-[120px]"
            >
              <option value="All" className="bg-zinc-950">All Statuses</option>
              <option value="DRAFT" className="bg-zinc-950">Drafts</option>
              <option value="SUBMITTED" className="bg-zinc-950">Submitted</option>
              <option value="ACCEPTED" className="bg-zinc-950">Awarded</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
            <SortAsc className="w-4 h-4 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-sm text-zinc-300 outline-none cursor-pointer"
            >
              <option value="newest" className="bg-zinc-950">Newest First</option>
              <option value="oldest" className="bg-zinc-950">Oldest First</option>
              <option value="value_high" className="bg-zinc-950">Price: High to Low</option>
            </select>
          </div>

          {isFiltered && (
            <Button variant="ghost" onClick={clearFilters} className="text-zinc-500 hover:text-white hover:bg-zinc-800">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Bid Grid */}
      <div className="grid gap-6">
        {loading ? (
            <div className="text-center py-24"><Clock className="animate-spin mx-auto h-8 w-8 text-zinc-500" /></div>
        ) : bids.length === 0 ? (
          <div className="text-center py-24 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
            <Gavel className="h-8 w-8 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-300">No active bids</h3>
            <p className="text-zinc-500 mt-2">Explore open tenders to get started.</p>
          </div>
        ) : (
          bids.map((bid) => {
            const status = getStatusConfig(bid.status);
            const isDraft = bid.status === 'DRAFT';
            const canAction = bid.tender?.status === 'PUBLISHED';

            return (
              <Card key={bid._id} className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-all group overflow-hidden">
                <CardContent className="p-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                  <div className="flex-1 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={`${status.color} border px-2 py-0.5 rounded-full capitalize text-[10px] font-bold tracking-wider`}>
                          <status.icon className="mr-1 h-3 w-3" /> {status.label}
                        </Badge>
                        <div className="flex items-center text-xs text-zinc-500">
                          <Hash className="h-3 w-3 mr-1" /> {bid.tender?.referenceNumber || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
                      {bid.tender?.title}
                    </h3>

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center text-sm text-zinc-400">
                        <Building2 className="mr-2 h-4 w-4 text-zinc-500" />
                        {bid.tender?.ownerCompany?.name}
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/20 md:w-80 p-6 flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-zinc-500">Your Quote</p>
                      <div className="text-2xl font-black text-emerald-400">
                        ${bid.amount?.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="w-full bg-zinc-800 hover:bg-zinc-700"
                        onClick={() => handleEditClick(bid, true)}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" /> Details
                      </Button>

                      {isDraft && canAction && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            size="sm" 
                            className="bg-blue-600"
                            onClick={() => handleEditClick(bid, false)}
                          >
                            <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-emerald-600"
                            onClick={() => openSubmitAudit(bid)}
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Submit
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* --- SUBMISSION AUDIT OVERLAY (Mirroring Tender Audit) --- */}
      {submitConfirmData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-zinc-950 border border-blue-500/30 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold">Proposal Final Review</h2>
                <p className="text-zinc-400 text-sm">Once submitted, financial quotes are locked.</p>
              </div>

              <div className="bg-zinc-900 rounded-xl p-4 text-left space-y-2 border border-zinc-800">
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-xs font-bold uppercase">Quote:</span>
                  <span className="text-emerald-400 font-black">${submitConfirmData.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-xs font-bold uppercase">Timeline:</span>
                  <span className="text-white font-bold">{submitConfirmData.deliveryDays} Days</span>
                </div>
              </div>

              <div className="text-left space-y-2">
                <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest px-1">Envelopes Attached</p>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {[...(submitConfirmData.technicalDocs || []), ...(submitConfirmData.financialDocs || [])].map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                      <FileIcon className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs text-zinc-300 truncate">{doc.name || `Attachment ${idx+1}`}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button onClick={confirmSubmission} className="bg-blue-600 hover:bg-blue-700 w-full font-bold">
                  Confirm & Submit Proposal
                </Button>
                <Button variant="ghost" onClick={() => setSubmitConfirmData(null)} className="text-zinc-500">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedBid && (
    <BidSubmissionModal 
      isOpen={isEditModalOpen} 
      onClose={() => { 
        setIsEditModalOpen(false); 
        setSelectedBid(null); 
      }} 
      existingBid={selectedBid} 
      isViewOnly={isViewOnly}
      tender={selectedBid.tender}
      onRefresh={fetchMyBids}
    /> 
  )}
    </div>
  );
}