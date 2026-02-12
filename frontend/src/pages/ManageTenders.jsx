import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useAuth } from '@/context/authContext';
import api from '@/api/axios';
import { toast } from "react-hot-toast";
import {
  Gavel, Clock, CheckCircle2, XCircle,
  FileText, DollarSign, Edit3,
  Users, Calendar, Plus, Eye, Award,
  MoreVertical, Trash2, Send, AlertTriangle,
  Loader2, ShieldCheck, ExternalLink, FileIcon, X,
  Search, Filter, SortAsc, RotateCcw
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import CreateTenderModal from '@/components/tenders/CreateTenderModal';

export default function ManageTenders() {
  const navigate = useNavigate();
  const { state } = useAuth();

  // --- FILTER STATES ---
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("All");
  // Passing filters to the hook. 
  // Ensure your useDashboardStats hook passes these as query params to /my-company
  const { tenders, loading, refreshData } = useDashboardStats(state.user?.role, { search, category, sortBy, statusFilter });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTender, setSelectedTender] = useState(null);
  const [publishConfirmData, setPublishConfirmData] = useState(null);

  const isFiltered = search !== "" || category !== "All" || sortBy !== "newest";

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setSortBy("newest");
  };

  const openCreateModal = () => {
    setSelectedTender(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tender) => {
    setSelectedTender(tender);
    setIsModalOpen(true);
  };

  const handleAction = async (id, action) => {
    const tender = tenders.find(t => t._id === id);
    if (!tender) return;

    if (action === 'publish') {
      const missingFields = [];
      if (!tender.emdAmount || Number(tender.emdAmount) <= 0) missingFields.push("EMD Amount");
      if (!tender.estimatedValue || Number(tender.estimatedValue) <= 0) missingFields.push("Estimated Value");
      if (!tender.documents || tender.documents.length === 0) missingFields.push("Documents");

      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(', ')}`);
        openEditModal(tender);
        return;
      }
      setPublishConfirmData(JSON.parse(JSON.stringify(tender)));
      return;
    }

    try {
      if (action === 'delete' && !window.confirm('Permanently delete this draft?')) return;
      if (action === 'close' && !window.confirm('Close this tender for bidding?')) return;

      if (action === 'delete') {
        await api.delete(`/tenders/${id}`);
      } else {
        await api.patch(`/tenders/${id}/${action}`);
      }

      toast.success(`Tender ${action}ed successfully`);
      refreshData();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action}`);
    }
  };

  const confirmPublish = async () => {
    if (!publishConfirmData) return;
    try {
      await api.patch(`/tenders/${publishConfirmData._id}/publish`, {
        documents: publishConfirmData.documents
      });
      toast.success("Tender is now LIVE!");
      setPublishConfirmData(null);
      refreshData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish");
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: <Send className="w-3 h-3" /> };
      case 'CLOSED':
        return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: <XCircle className="w-3 h-3" /> };
      case 'AWARDED':
        return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <Award className="w-3 h-3" /> };
      default: // DRAFT
        return { color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', icon: <Edit3 className="w-3 h-3" /> };
    }
  };

  if (loading && tenders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-zinc-500 animate-pulse">Synchronizing Tender Registry...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-zinc-800 pb-6">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-white tracking-tight">Management Console</h1>
          <p className="text-zinc-500 mt-1 text-left">Full lifecycle control for your procurement pipeline.</p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-4 h-4 mr-2" /> Create New Tender
        </Button>
      </div>

      {/* --- SEARCH & FILTER BAR --- */}
      <div className="flex flex-col md:flex-row gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
    <input
      type="text"
      placeholder="Search by title, description or tags..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:border-blue-500/50 outline-none transition-all"
    />
  </div>

  <div className="flex flex-wrap gap-3">
    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
      <Filter className="w-4 h-4 text-zinc-500" />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="bg-transparent text-sm text-zinc-300 outline-none cursor-pointer min-w-[120px]"
      >
        <option value="All" className="bg-zinc-950 text-white">All Categories</option>
        <option value="IT Services" className="bg-zinc-950 text-white">IT Services</option>
        <option value="Construction" className="bg-zinc-950 text-white">Construction</option>
        <option value="Consultancy" className="bg-zinc-950 text-white">Consultancy</option>
        <option value="Logistics" className="bg-zinc-950 text-white">Logistics</option>
        <option value="Manufacturing" className="bg-zinc-950 text-white">Manufacturing</option>
      </select>
    </div>

    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
      <Clock className="w-4 h-4 text-zinc-500" />
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="bg-transparent text-sm text-zinc-300 outline-none cursor-pointer"
      >
        <option value="All" className="bg-zinc-950 text-white">All Statuses</option>
        <option value="DRAFT" className="bg-zinc-950 text-white">Drafts Only</option>
        <option value="PUBLISHED" className="bg-zinc-950 text-white">Live Tenders</option>
        <option value="CLOSED" className="bg-zinc-950 text-white">Closed</option>
        <option value="AWARDED" className="bg-zinc-950 text-white">Awarded</option>
      </select>
    </div>

    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
      <SortAsc className="w-4 h-4 text-zinc-500" />
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="bg-transparent text-sm text-zinc-300 outline-none cursor-pointer"
      >
        <option value="newest" className="bg-zinc-950 text-white">Newest First</option>
        <option value="oldest" className="bg-zinc-950 text-white">Oldest First</option>
        <option value="deadline" className="bg-zinc-950 text-white">Closing Soon</option>
        <option value="status" className="bg-zinc-950 text-white">Group by Status</option>
        <option value="value_high" className="bg-zinc-950 text-white">Value: High to Low</option>
        <option value="value_low" className="bg-zinc-950 text-white">Value: Low to High</option>
      </select>
    </div>

    {isFiltered && (
      <Button
        variant="ghost"
        onClick={clearFilters}
        className="text-zinc-500 hover:text-white hover:bg-zinc-800 px-3"
      >
        <RotateCcw className="w-4 h-4 mr-2" /> Reset
      </Button>
    )}
  </div>
</div>

      {/* Tender Cards Grid */}
      <div className="grid gap-4">
        {tenders.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
            <Gavel className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-500">
              {isFiltered ? "No results match your filters." : "No projects found. Start by creating a draft."}
            </p>
            {isFiltered && (
              <Button variant="link" onClick={clearFilters} className="text-blue-500 mt-2">
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          tenders.map((tender) => {
            console.log(`Tender: ${tender.title}, Bids:`, tender.bids);
            const config = getStatusConfig(tender.status);
            const isDraft = tender.status === 'DRAFT';
            const isMissingData = isDraft && (!tender.emdAmount || tender.documents?.length === 0);

            return (
              <Card key={tender._id} className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-all group">
                <CardContent className="p-0 flex">
                  <div className={`w-1.5 ${config.bg.replace('/10', '')}`} />

                  <div className="flex-1 p-6 text-left">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className={`${config.bg} ${config.color} ${config.border} flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider`}>
                            {config.icon} {tender.status}
                          </Badge>
                          {isMissingData && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                              <AlertTriangle className="w-3 h-3" /> INCOMPLETE
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
                          {tender.title}
                        </h3>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white hover:bg-zinc-800">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300 w-48">
                          <DropdownMenuItem onClick={() => navigate(`/tenders/${tender._id}`)} className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>

                          {isDraft && (
                            <>
                              <DropdownMenuItem onClick={() => openEditModal(tender)} className="cursor-pointer">
                                <Edit3 className="w-4 h-4 mr-2" /> Edit Draft
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-zinc-800" />
                              <DropdownMenuItem onClick={() => handleAction(tender._id, 'delete')} className="text-red-400 focus:text-red-400 cursor-pointer">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase text-zinc-500 font-semibold tracking-widest">Est. Value</p>
                        <div className={`flex items-center font-bold ${tender.estimatedValue > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                          <DollarSign className="w-4 h-4" />
                          {tender.estimatedValue ? tender.estimatedValue.toLocaleString() : '---'}
                        </div>
                      </div>

                      <div className="space-y-1">
  <p className="text-[10px] uppercase text-zinc-500 font-semibold tracking-widest">Bids</p>
  <div className="flex items-center text-zinc-200 font-bold">
    <Users className="w-4 h-4 mr-2 text-blue-500" />
    {/* Use optional chaining and check for array length specifically */}
    {Array.isArray(tender.bids) ? tender.bids.length : (tender.bidCount || 0)}
  </div>
</div>

                      <div className="space-y-1">
                        <p className="text-[10px] uppercase text-zinc-500 font-semibold tracking-widest">Deadline</p>
                        <div className="flex items-center text-zinc-300 text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-zinc-500" />
                          {new Date(tender.endDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        {isDraft && (
                          <Button
                            size="sm"
                            onClick={() => handleAction(tender._id, 'publish')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 shadow-lg shadow-emerald-900/20"
                          >
                            <Send className="w-3.5 h-3.5 mr-2" /> Publish
                          </Button>
                        )}
                        {tender.status === 'PUBLISHED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(tender._id, 'close')}
                            className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10 font-bold h-9 px-4"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-2" /> Close Tender
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

      {/* --- PUBLISH CONFIRMATION OVERLAY --- */}
      {publishConfirmData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-zinc-950 border border-emerald-500/30 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white">Final Document Audit</h2>
                <p className="text-zinc-400 text-sm">Review files. Delete unwanted uploads before publishing.</p>
              </div>

              <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800 space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold">Category:</span>
                  <span className="text-zinc-300 text-xs font-bold">{publishConfirmData.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold">Est. Value:</span>
                  <span className="text-emerald-400 text-xs font-bold">${Number(publishConfirmData.estimatedValue || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold">EMD Amount:</span>
                  <span className="text-white text-xs font-bold">${Number(publishConfirmData.emdAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold">Deadline:</span>
                  <span className="text-white text-xs font-bold">{new Date(publishConfirmData.endDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="text-left space-y-2">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Attached Files</p>
                  <Badge variant="outline" className="text-[9px] h-4 border-zinc-800 text-zinc-400">
                    {publishConfirmData.documents?.length || 0} Files
                  </Badge>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {publishConfirmData.documents?.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 group hover:border-zinc-700 transition-all"
                    >
                      <a
                        href={doc.url || doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center gap-3 truncate group-hover:text-blue-400"
                      >
                        <FileIcon className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="text-xs text-zinc-300 truncate max-w-[180px]">
                          {doc.name || `Document ${idx + 1}`}
                        </span>
                        <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setPublishConfirmData(prev => ({
                            ...prev,
                            documents: prev.documents.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {(!publishConfirmData.documents || publishConfirmData.documents.length === 0) && (
                    <div className="text-center py-6 border border-dashed border-zinc-800 rounded-lg">
                      <p className="text-xs text-zinc-600">No documents attached.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800">
                <Button
                  onClick={confirmPublish}
                  disabled={publishConfirmData.documents?.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-11 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm & Go Live
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPublishConfirmData(null)}
                  className="text-zinc-500 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateTenderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTender(null);
        }}
        editData={selectedTender}
        onSuccess={() => {
          setIsModalOpen(false);
          refreshData();
        }}
      />
    </div>
  );
}