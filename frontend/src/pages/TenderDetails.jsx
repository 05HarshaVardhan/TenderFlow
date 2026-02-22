import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/api/axios';
import { useAuth } from '@/context/authContext';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, User, Clock, DollarSign, 
  FileText, Download, ShieldCheck, ExternalLink, 
  Users, CheckCircle2, X, FileIcon, ExternalLink as ExternalLinkIcon,
  FileDown, Calendar, CalendarDays, Tag, Hash, Sparkles
} from "lucide-react";
import { toast } from "react-hot-toast";
import { saveAs } from 'file-saver';

export default function TenderDetails() {
  const { state } = useAuth();
  const user = state?.user;
  const { id } = useParams();
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const [viewingFiles, setViewingFiles] = useState(null); // 'technical' or 'financial'
  const [downloadingFile, setDownloadingFile] = useState(null);

  const canAnalyzeBids = ['COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'].includes(user?.role);

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return `$${amount.toLocaleString()}`;
  };

  const formatSignedPercent = (value) => {
    const num = Number(value || 0);
    return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const handleDownloadFile = async (file) => {
    try {
      setDownloadingFile(file.public_id);
      
      // Get the file as a blob
      const response = await fetch(file.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      
      // Use file-saver to handle the download with proper filename
      saveAs(blob, file.name || `document_${file.public_id}.pdf`);
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    } finally {
      setDownloadingFile(null);
    }
  };

  const fetchData = async () => {
    try {
      const [tRes, bRes] = await Promise.all([
        api.get(`/tenders/${id}`),
        api.get(`/bids/tender/${id}`)
      ]);
      setTender(tRes.data);
      setBids(bRes.data);
      setAnalysisReport(tRes.data?.analysisReport || null);
    } catch {
      toast.error("Error loading tender details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAward = async (bidId) => {
    try {
      await api.patch(`/tenders/${id}/award`, { winnerBidId: bidId });
      toast.success("Tender awarded successfully!");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to award tender");
    }
  };

  const handleAnalyzeBids = async () => {
    try {
      setAnalyzing(true);
      const res = await api.post(`/tenders/${id}/analyze-bids`);
      const report = res.data?.analysisReport || null;
      setAnalysisReport(report);
      setTender((prev) => prev ? ({ ...prev, analysisReport: report }) : prev);
      toast.success("Bid analysis generated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to analyze bids");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <div className="p-8 text-white text-center">Loading secure data...</div>;
  if (!tender) return <div className="p-8 text-white text-center">Tender not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-white pb-12">
      {/* 1. Tender Header & Specifications */}
      <div className="bg-zinc-950 p-8 rounded-xl border border-zinc-800 shadow-xl">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 mb-2">
              {tender.category || 'General'}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight">{tender.title}</h1>
          </div>
          <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 px-4 py-1 text-sm uppercase">
            {tender.status}
          </Badge>
        </div>

        <p className="text-zinc-400 text-lg leading-relaxed mb-8">{tender.description}</p>

        {/* Tender Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <CalendarDays className="h-4 w-4" />
              <span>Published</span>
            </div>
            <div className="text-white font-medium">
              {tender.createdAt ? (
                <>
                  {new Date(tender.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                  <span className="text-xs text-zinc-500 block mt-1">
                    {Math.floor((new Date() - new Date(tender.createdAt)) / (1000 * 60 * 60 * 24))} days ago
                  </span>
                </>
              ) : 'N/A'}
            </div>
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <Clock className="h-4 w-4" />
              <span>Deadline</span>
            </div>
            <div className="text-white font-medium">
              {tender.endDate ? (
                <>
                  {new Date(tender.endDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                  <span className={`text-xs block mt-1 ${
                    new Date(tender.endDate) < new Date() 
                      ? 'text-red-400' 
                      : 'text-zinc-500'
                  }`}>
                    {new Date(tender.endDate) > new Date() 
                      ? `${Math.ceil((new Date(tender.endDate) - new Date()) / (1000 * 60 * 60 * 24))} days remaining`
                      : 'Deadline passed'}
                  </span>
                </>
              ) : 'Not specified'}
            </div>
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              <span>Estimated Value</span>
            </div>
            <div className="text-white font-medium">
              {tender.estimatedValue 
                ? `$${tender.estimatedValue.toLocaleString()}` 
                : 'Not specified'}
            </div>
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <Hash className="h-4 w-4" />
              <span>Reference</span>
            </div>
            <div className="text-white font-medium">
              {tender.referenceNumber || 'N/A'}
            </div>
          </div>
        </div>

        {/* Document Section */}
        {tender.documents?.length > 0 && (
          <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Technical Specifications & Annexures
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tender.documents.map((doc, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleDownloadFile(doc)}
                  className="flex items-center justify-between p-3 bg-zinc-950 rounded-md border border-zinc-800 hover:border-blue-500 group transition-all cursor-pointer"
                >
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-200 truncate pr-4">
                    {doc.name}
                  </span>
                  {downloadingFile === doc.public_id ? (
                    <span className="animate-spin h-4 w-4 flex items-center justify-center">↻</span>
                  ) : (
                    <Download className="h-4 w-4 text-zinc-600 group-hover:text-blue-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. AI Analysis Section */}
      {canAnalyzeBids && (
        <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-400" />
                Bid Analysis
              </h2>
              <p className="text-zinc-500 text-sm mt-1">
                AI-assisted comparative report for submitted bids.
              </p>
            </div>
            <Button
              onClick={handleAnalyzeBids}
              disabled={analyzing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {analyzing ? "Analyzing..." : "Analyze Bids"}
            </Button>
          </div>

          {analysisReport ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Summary</p>
                  <p className="text-zinc-200 text-sm leading-relaxed">
                    {analysisReport.summary || 'No summary available.'}
                  </p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Recommendation</p>
                  <p className="text-zinc-200 text-sm leading-relaxed">
                    {analysisReport.recommendation || 'No recommendation available.'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-3">
                    Model: {analysisReport.model || 'deterministic fallback'}
                  </p>
                </div>
              </div>

              {analysisReport.statistics && (
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Bid Distribution Metrics</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-zinc-950 rounded border border-zinc-800 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Average Bid</p>
                      <p className="text-sm font-semibold text-zinc-100 mt-1">
                        {formatCurrency(analysisReport.statistics.averageBid)}
                      </p>
                    </div>
                    <div className="bg-zinc-950 rounded border border-zinc-800 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Median Bid</p>
                      <p className="text-sm font-semibold text-zinc-100 mt-1">
                        {formatCurrency(analysisReport.statistics.medianBid)}
                      </p>
                    </div>
                    <div className="bg-zinc-950 rounded border border-zinc-800 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Range</p>
                      <p className="text-sm font-semibold text-zinc-100 mt-1">
                        {formatCurrency(analysisReport.statistics.minBid)} - {formatCurrency(analysisReport.statistics.maxBid)}
                      </p>
                    </div>
                    <div className="bg-zinc-950 rounded border border-zinc-800 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Spread</p>
                      <p className="text-sm font-semibold text-zinc-100 mt-1">
                        {formatCurrency(analysisReport.statistics.rangeBid)}
                      </p>
                    </div>
                    <div className="bg-zinc-950 rounded border border-zinc-800 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Std Deviation</p>
                      <p className="text-sm font-semibold text-zinc-100 mt-1">
                        {formatCurrency(analysisReport.statistics.stdDeviationBid)}
                      </p>
                    </div>
                    <div className="bg-zinc-950 rounded border border-zinc-800 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Coefficient of Variation</p>
                      <p className="text-sm font-semibold text-zinc-100 mt-1">
                        {analysisReport.statistics.coefficientOfVariationPct?.toFixed?.(2) || Number(analysisReport.statistics.coefficientOfVariationPct || 0).toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-zinc-950 rounded border border-zinc-800 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Average Delivery</p>
                      <p className="text-sm font-semibold text-zinc-100 mt-1">
                        {Number(analysisReport.statistics.averageDeliveryDays || 0).toFixed(1)} days
                      </p>
                    </div>
                    <div className="bg-zinc-950 rounded border border-zinc-800 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Delivery Range</p>
                      <p className="text-sm font-semibold text-zinc-100 mt-1">
                        {analysisReport.statistics.minDeliveryDays || 0} - {analysisReport.statistics.maxDeliveryDays || 0} days
                      </p>
                    </div>
                    <div className="bg-zinc-950 rounded border border-zinc-800 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Avg vs Estimate</p>
                      <p className={`text-sm font-semibold mt-1 ${
                        Number(analysisReport.statistics.averageVsEstimatePct || 0) > 0
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}>
                        {formatSignedPercent(analysisReport.statistics.averageVsEstimatePct)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Ranking</p>
                {Array.isArray(analysisReport.ranking) && analysisReport.ranking.length > 0 ? (
                  <div className="space-y-2">
                    {analysisReport.ranking.map((item, index) => (
                      <div
                        key={`${item.bidId || index}`}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 bg-zinc-950 rounded border border-zinc-800"
                      >
                        <div className="text-sm text-zinc-200">
                          <span className="text-zinc-500 mr-2">#{item.position || index + 1}</span>
                          {item.bidderCompany || 'Unknown bidder'}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {item.reason || (item.weightedScore !== undefined ? `Score: ${item.weightedScore}` : 'No details')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No ranking data available.</p>
                )}
              </div>

              <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Risks</p>
                {Array.isArray(analysisReport.risks) && analysisReport.risks.length > 0 ? (
                  <div className="space-y-2">
                    {analysisReport.risks.map((risk, idx) => (
                      <div
                        key={`${risk.bidId || idx}-${risk.risk || idx}`}
                        className="p-3 bg-zinc-950 rounded border border-zinc-800 text-sm text-zinc-300"
                      >
                        <span className="font-semibold text-zinc-100">
                          {risk.bidderCompany || 'Bidder'}:
                        </span>{" "}
                        {risk.risk || 'Risk detail unavailable'}
                        {risk.severity ? (
                          <span className="ml-2 text-xs text-amber-400 uppercase">({risk.severity})</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No major risks flagged.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-zinc-700 text-sm text-zinc-500">
              Run analysis to generate a comparative bid report.
            </div>
          )}
        </div>
      )}

      {/* 2. Bids Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 px-2">
          <Users className="h-5 w-5 text-blue-500" /> 
          Bids Received ({bids.length})
        </h2>

        <div className="grid gap-4">
          {bids.map((bid) => (
            <Card key={bid._id} className="bg-zinc-950 border-zinc-800 border-l-4 border-l-blue-600 hover:bg-zinc-900/30 transition-all">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  
                  {/* Bidder Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                        <User className="h-5 w-5 text-zinc-400" />
                      </div>
                      <div>
                        <div className="font-bold text-zinc-100">
                          {bid.bidderCompany?.name || bid.bidderName || "Anonymous Vendor"}
                        </div>
                        <div className="text-xs text-zinc-500 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Two-Envelope Verified
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 italic bg-zinc-900/50 p-3 rounded border border-zinc-800">
                      "{bid.notes || 'No additional proposal notes provided.'}"
                    </p>

                    {/* Envelope Downloads */}
                    <div className="flex flex-wrap gap-2">
                       {bid.technicalDocs?.length > 0 && (
                         <Badge 
                           variant="outline" 
                           className="bg-blue-500/5 border-blue-500/20 text-blue-400 cursor-pointer hover:bg-blue-500/10"
                           onClick={() => {
                             setSelectedBid(bid);
                             setViewingFiles('technical');
                           }}
                         >
                           <FileText className="w-3 h-3 mr-1" /> Technical Env ({bid.technicalDocs.length})
                         </Badge>
                       )}
                       {bid.financialDocs?.length > 0 && (
                         <Badge 
                           variant="outline" 
                           className="bg-emerald-500/5 border-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/10"
                           onClick={() => {
                             setSelectedBid(bid);
                             setViewingFiles('financial');
                           }}
                         >
                           <DollarSign className="w-3 h-3 mr-1" /> Financial Env ({bid.financialDocs.length})
                         </Badge>
                       )}
                    </div>
                  </div>

                  {/* Pricing & Actions */}
                  <div className="flex flex-col items-end gap-4 min-w-[150px]">
                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-400 flex items-center justify-end">
                        <DollarSign className="h-5 w-5" />
                        {bid.amount?.toLocaleString() || '---'}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-zinc-500 text-xs font-medium">
                        <Clock className="h-3 w-3" /> {bid.deliveryDays} Days Timeline
                      </div>
                    </div>

                    {tender.status === 'CLOSED' && (
                      <Button 
                        onClick={() => handleAward(bid._id)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        <Trophy className="mr-2 h-4 w-4" /> Award Tender
                      </Button>
                    )}

                    {bid.status === 'ACCEPTED' && (
                      <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="h-4 w-4" /> Winner
                      </div>
                    )}
                  </div>

                </div>
              </CardContent>
            </Card>
          ))}

          {bids.length === 0 && (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
              <p className="text-zinc-500 font-medium">No bids have been submitted yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* File Viewer Modal */}
      {selectedBid && viewingFiles && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold">
                {viewingFiles === 'technical' ? 'Technical' : 'Financial'} Documents - {selectedBid.bidderCompany?.name || 'Bidder'}
              </h3>
              <button 
                onClick={() => {
                  setSelectedBid(null);
                  setViewingFiles(null);
                }}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {selectedBid[`${viewingFiles}Docs`]?.length > 0 ? (
                <div className="space-y-3">
                  {selectedBid[`${viewingFiles}Docs`].map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                      <div className="flex items-center gap-3">
                        <FileIcon className="h-5 w-5 text-blue-400" />
                        <span className="text-sm font-medium">
                          {doc.name || `Document ${idx + 1}`}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFile(doc);
                        }}
                        className="text-blue-400 hover:text-blue-300 p-1 disabled:opacity-50"
                        disabled={downloadingFile === doc.public_id}
                        title="Download file"
                      >
                        {downloadingFile === doc.public_id ? (
                          <span className="animate-spin">↻</span>
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  No {viewingFiles} documents found for this bid.
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-zinc-800 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedBid(null);
                  setViewingFiles(null);
                }}
                className="border-zinc-700 hover:bg-zinc-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
