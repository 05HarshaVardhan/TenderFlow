import React, { useState, useEffect } from 'react';
import api from '@/api/axios';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Gavel, Clock, CheckCircle2, XCircle, 
  ExternalLink, FileText, DollarSign, Edit3,
  Building2, User2, Hash, Calendar,
  Search, Filter, SortAsc, RotateCcw, AlertTriangle, ShieldCheck, Trash2, FileIcon,
  Ban // Added for Withdrawn icon
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import BidSubmissionModal from '@/components/tenders/BidSubmissionModal';

const BidRelationshipSummary = ({ bid, tender }) => {
   console.log('Bid data:', bid);
  console.log('Tender data:', tender);
  if (!bid || !tender) return null;
 
  // Use the correct property names from your data structure
 const budget = tender.estimatedValue || tender.budget || 0;
  const bidAmount = Number(bid.amount) || 0;
  if (!bid || !tender) {
    console.log('Missing bid or tender data');
    return null;
  }
  // Calculate budget utilization with safety checks
  const budgetUtilization = budget > 0 
    ? ((bidAmount / budget) * 100).toFixed(1)
    : 'N/A';
 
  const isOverBudget = budget > 0 && bidAmount > budget;
  // Calculate rough score with safety checks
  const priceScore = budget > 0 
    ? Math.max(0, 100 - ((bidAmount / budget) * 50))
    : 0;
  
  const roughScore = Math.min(100, priceScore).toFixed(0);
 
  return (
     <div className="space-y-6 my-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
          <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Budget Alignment</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold ${
              budgetUtilization === 'N/A' ? 'text-zinc-500' : 
              bidAmount > budget ? 'text-orange-400' : 'text-emerald-400'
            }`}>
              {budgetUtilization}{budgetUtilization !== 'N/A' ? '%' : ''}
            </span>
            <span className="text-xs text-zinc-500">of budget</span>
          </div>
          {budget > 0 && (
            <p className="text-[10px] text-zinc-500 mt-1">
              Budget: ${budget.toLocaleString()}
            </p>
          )}
        </div>
        
        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
          <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Delivery Speed</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-blue-400">
              {bid.deliveryDays || 'N/A'}
            </span>
            <span className="text-xs text-zinc-500">Days</span>
          </div>
        </div>
 
        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
          <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Competitiveness Index</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {budget > 0 ? `${roughScore}/100` : 'N/A'}
            </span>
            <span className="text-[10px] text-zinc-500 italic">Est. Match</span>
          </div>
        </div>
      </div>
      {/* 2. Side-by-Side Comparison Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/80 text-zinc-500 text-[10px] uppercase font-bold">
            <tr>
              <th className="px-4 py-3 text-left">Criteria</th>
              <th className="px-4 py-3 text-left">Tender Requirement</th>
              <th className="px-4 py-3 text-left">Your Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            <tr>
  <td className="px-4 py-4 text-zinc-500 font-medium">Financial</td>
  <td className="px-4 py-4">Max Budget: <span className="text-zinc-300 font-bold">${budget.toLocaleString()}</span></td>
  <td className="px-4 py-4">Proposed: <span className="text-emerald-400 font-bold">${bid.amount?.toLocaleString()}</span></td>
</tr>
            <tr>
              <td className="px-4 py-4 text-zinc-500 font-medium">Timeline</td>
              <td className="px-4 py-4">Deadline: <span className="text-zinc-300 font-bold">{new Date(tender.deadline).toLocaleDateString()}</span></td>
              <td className="px-4 py-4">Duration: <span className="text-blue-400 font-bold">{bid.deliveryDays} Working Days</span></td>
            </tr>
            <tr>
              <td className="px-4 py-4 text-zinc-500 font-medium">Envelopes</td>
              <td className="px-4 py-4">Technical & Financial</td>
              <td className="px-4 py-4">
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[10px] border-zinc-700">{bid.technicalDocs?.length || 0} Tech</Badge>
                  <Badge variant="outline" className="text-[10px] border-zinc-700">{bid.financialDocs?.length || 0} Finance</Badge>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. Evaluation Rough Idea */}
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-200">Evaluation Insight</h4>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Based on the current budget utilization of {budgetUtilization}%, this bid is positioned as a 
              {isOverBudget ? " Premium " : " Highly Competitive "} proposal. Ensure all technical documentation supports the 
              {bid.deliveryDays}-day delivery window for maximum evaluation scoring.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const WithdrawConfirmationModal = ({ isOpen, onClose, onConfirm, bidId, isWithdrawing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-100">Permanent Withdrawal</h3>
            <p className="text-zinc-400 text-sm mt-2">
              This action has serious consequences for your company's eligibility.
            </p>
          </div>
          
          <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 space-y-3 mb-8">
            <div className="flex gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <p className="text-sm text-zinc-300">Your company is <b>permanently banned</b> from bidding on this specific tender.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <p className="text-sm text-zinc-300">Existing documents and quotes will be archived as "Withdrawn".</p>
            </div>
            <div className="flex gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <p className="text-sm text-zinc-300">This cannot be reversed by administrators.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => onConfirm(bidId)}
              disabled={isWithdrawing}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6"
            >
              {isWithdrawing ? (
                <Clock className="animate-spin h-5 w-5 mr-2" />
              ) : "Confirm & Revoke Eligibility"}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isWithdrawing}
              className="w-full text-zinc-500 hover:text-zinc-300"
            >
              Nevermind, keep my bid
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default function MyBids() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWithdrawingId, setIsWithdrawingId] = useState(null);
  // --- STATE FOR MODALS ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [submitConfirmData, setSubmitConfirmData] = useState(null);

  // --- FILTER STATES (Synced with Tender Logic) ---
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
const [analyzingBid, setAnalyzingBid] = useState(null);
  const isFiltered = search !== "" || statusFilter !== "All" || sortBy !== "newest";
  const [withdrawModal, setWithdrawModal] = useState({
    isOpen: false,
    bidId: null
  });
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
    const confirmed = window.confirm(
      "CRITICAL WARNING: If you withdraw this bid, NO ONE from your company can bid on this tender ever again. This action is permanent and cannot be undone. Proceed?"
    );
    
    if (!confirmed) return;

    try {
      setIsWithdrawingId(bidId);
      await api.patch(`/bids/${bidId}/withdraw`);
      toast.success("Bid withdrawn. Company eligibility revoked for this tender.");
      fetchMyBids(); // Refresh the list
    } catch (err) {
      toast.error(err.response?.data?.message || "Withdrawal failed");
    } finally {
      setIsWithdrawingId(null);
    }
  };

  const handleWithdrawTrigger = (bidId) => {
    setWithdrawModal({ isOpen: true, bidId });
  };

  const confirmWithdraw = async () => {
    const bidId = withdrawModal.bidId;
    try {
      setIsWithdrawingId(bidId);
      await api.patch(`/bids/${bidId}/withdraw`);
      toast.success("Bid withdrawn and eligibility revoked.");
      
      // Close modal and refresh data
      setWithdrawModal({ isOpen: false, bidId: null });
      fetchMyBids();
    } catch (err) {
      toast.error(err.response?.data?.message || "Withdrawal failed");
    } finally {
      setIsWithdrawingId(null);
    }
  };

 const getStatusConfig = (status) => {
    switch (status) {
      case 'ACCEPTED': return { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2, label: 'Winner' };
      case 'REJECTED': return { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle, label: 'Rejected' };
      case 'SUBMITTED': return { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock, label: 'Under Review' };
      case 'WITHDRAWN': return { color: 'bg-zinc-800 text-zinc-500 border-zinc-700', icon: Ban, label: 'Withdrawn' }; // Added status
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
              <option value="WITHDRAWN" className="bg-zinc-950">Withdrawn</option>
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
        ) : (
          bids.map((bid) => {
            const status = getStatusConfig(bid.status);
            const isDraft = bid.status === 'DRAFT';
            const isSubmitted = bid.status === 'SUBMITTED';
            const isWithdrawn = bid.status === 'WITHDRAWN';
            const canAction = bid.tender?.status === 'PUBLISHED';

            return (
              <Card key={bid._id} className={`bg-zinc-950 border-zinc-800 transition-all group overflow-hidden ${isWithdrawn ? 'opacity-60 grayscale-[0.5]' : 'hover:border-zinc-700'}`}>
                <CardContent className="p-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                  <div className="flex-1 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={`${status.color} border px-2 py-0.5 rounded-full capitalize text-[10px] font-bold tracking-wider`}>
                          <status.icon className="mr-1 h-3 w-3" /> {status.label}
                        </Badge>
                        <div className="flex items-center text-x  s text-zinc-500">
                          <Hash className="h-3 w-3 mr-1" /> {bid.tender?.referenceNumber || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
                      {bid.tender?.title}
                    </h3>
                  </div>

                  <div className="bg-zinc-900/20 md:w-80 p-6 flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-zinc-500">Your Quote</p>
                      <div className={`text-2xl font-black ${isWithdrawn ? 'text-zinc-600 line-through' : 'text-emerald-400'}`}>
                        ${bid.amount?.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button 
  size="sm" 
  variant="secondary" 
  className="w-full bg-zinc-800 hover:bg-zinc-700"
  onClick={() => {
    setAnalyzingBid({...bid,tender:bid.tender});
    setIsAnalysisOpen(true);
  }}
>
  <ExternalLink className="mr-2 h-3.5 w-3.5" /> Analysis & Details
</Button>

                      {/* ACTION BUTTONS */}
                      <div className="grid grid-cols-1 gap-2">
                        {isDraft && canAction && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" className="bg-blue-600" onClick={() => handleEditClick(bid, false)}>
                              <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button size="sm" className="bg-emerald-600" onClick={() => openSubmitAudit(bid)}>
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Submit
                            </Button>
                          </div>
                        )}

                        {/* NEW: Withdrawal Button - Only show for Submitted bids */}
                        {isSubmitted && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="w-full text-red-500 hover:bg-red-500/10"
                    onClick={() => handleWithdrawTrigger(bid._id)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Withdraw Bid
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
    // PASS THE NEW SUMMARY COMPONENT AS A PROP IF THE MODAL SUPPORTS CUSTOM CHILDREN
    // OR UPDATE BidSubmissionModal.jsx TO USE THE LOGIC ABOVE
    headerContent={isViewOnly && (
      <BidRelationshipSummary bid={selectedBid} tender={selectedBid.tender} />
    )}
  />
)}
{/* --- ANALYSIS SIDE DRAWER --- */}
<Sheet open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
  <SheetContent className="w-full sm:max-w-xl bg-zinc-950 border-zinc-800 text-white overflow-y-auto">
    <SheetHeader className="border-b border-zinc-800 pb-6">
      <div className="flex items-center gap-2 text-blue-500 mb-2">
        <ShieldCheck className="w-5 h-5" />
        <span className="text-[10px] font-black uppercase tracking-widest">Proposal Analysis</span>
      </div>
      <SheetTitle className="text-2xl font-bold">
        {analyzingBid?.tender?.title}
      </SheetTitle>
      <SheetDescription className="text-zinc-500">
        Reference: {analyzingBid?.tender?.referenceNumber}
      </SheetDescription>
    </SheetHeader>

    {/* THE COMPONENT YOU CREATED */}
    {analyzingBid && (
      <div className="py-6">
        <BidRelationshipSummary 
          bid={analyzingBid} 
          tender={analyzingBid.tender} 
        />
        
        {/* Optional: Add a button to open the full View Modal if they need to see raw docs */}
        <div className="mt-8 pt-6 border-t border-zinc-900">
          <Button 
            variant="outline" 
            className="w-full border-zinc-800 text-zinc-400 hover:text-white"
            onClick={() => {
              setIsAnalysisOpen(false);
              handleEditClick(analyzingBid, true);
            }}
          >
            View Full Submission Documents
          </Button>
        </div>
      </div>
    )}
  </SheetContent>
</Sheet>
    <WithdrawConfirmationModal
        isOpen={withdrawModal.isOpen}
        onClose={() => setWithdrawModal({ isOpen: false, bidId: null })}
        onConfirm={confirmWithdraw}
        bidId={withdrawModal.bidId}
        isWithdrawing={isWithdrawingId === withdrawModal.bidId}
      /> 
    </div>
  );
}